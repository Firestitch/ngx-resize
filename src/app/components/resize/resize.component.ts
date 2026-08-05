import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
  afterNextRender,
  contentChildren,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { FsStore } from '@firestitch/store';

import {
  FsResizeContainer,
  IFsResizeHandleAria,
  IFsResizePanel,
} from '../../classes/resize-container';
import { FsResizeOrientation } from '../../types/resize-orientation.type';
import { FsResizePanelComponent } from '../resize-panel/resize-panel.component';


/** What one handle is moving, resolved once at the start of a drag. */
interface IResizeDrag {
  /** The panel whose handle started this, used to reject a stale move. */
  origin: IFsResizePanel;
  /** The panel that actually changes size. */
  target: IFsResizePanel;
  /** The panel on the other side of the seam, which changes by the inverse. */
  other: IFsResizePanel;
  /** +1 when dragging away from the target grows it, -1 when it shrinks it. */
  sign: number;
  targetStart: number;
  otherStart: number;
}


/**
 * A row or column of panels with draggable seams between them.
 *
 * ```html
 * <fs-resize persist="design-workspace">
 *   <fs-resize-panel [size]="260" [min]="180">…tree…</fs-resize-panel>
 *   <fs-resize-panel>…preview…</fs-resize-panel>
 * </fs-resize>
 * ```
 *
 * Handles are not written by hand — each panel renders the one on its own
 * leading edge. Give at least one panel no `size` so it can absorb the space the
 * fixed ones leave, and the layout survives a window resize.
 */
@Component({
  selector: 'fs-resize',
  template: '<ng-content></ng-content>',
  styleUrls: ['./resize.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  providers: [
    {
      provide: FsResizeContainer,
      useExisting: forwardRef(() => FsResizeComponent),
    },
  ],
  host: {
    'class': 'fs-resize',
    '[class.fs-resize-vertical]': 'orientation() === \'vertical\'',
  },
})
export class FsResizeComponent implements FsResizeContainer, OnDestroy {

  public orientation = input<FsResizeOrientation>('horizontal');
  public disabled = input<boolean>(false);

  /** How far one arrow-key press moves a handle, in pixels. */
  public step = input<number>(10);

  /**
   * Remember the panel sizes under this key, across reloads. Sizes are discarded
   * if the number of panels has changed since they were saved, so adding a panel
   * cannot restore the layout onto the wrong ones.
   */
  public persist = input<string | null>(null);

  /** The size of every panel after a drag, `null` for each flexible one. */
  public sizesChange = output<(number | null)[]>();

  public panels = contentChildren(FsResizePanelComponent);

  private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private _ngZone = inject(NgZone);

  // Optional injection so an app that never sets `persist` does not have to
  // provide FsStoreModule. The package itself is still a peer dependency.
  private _store = inject(FsStore, { optional: true });

  /** The container's own size along its axis, tracked by the ResizeObserver. */
  private _containerSize = signal<number>(0);

  private _drag: IResizeDrag | null = null;
  private _observer: ResizeObserver | null = null;

  constructor() {
    // After the first render rather than in ngAfterContentInit: the content
    // query is settled by then, and writing panel sizes outside a change
    // detection pass cannot trip ExpressionChangedAfterItHasBeenChecked.
    afterNextRender(() => {
      this._restore();
      this._observeContainer();
    });
  }

  public ngOnDestroy(): void {
    this._observer?.disconnect();
    this._observer = null;
  }

  public hasHandle(panel: IFsResizePanel): boolean {
    return panel.resizable() && !!this._panelBefore(panel);
  }

  /**
   * What `role="separator"` reports. By convention a splitter describes the pane
   * BEFORE it, so that is the first choice; when that pane is the flexible one
   * the handle cannot move it, and it describes the pane after instead.
   */
  public handleAria(panel: IFsResizePanel): IFsResizeHandleAria {
    const previous = this._panelBefore(panel);

    if (!previous) {
      return { now: 0, min: 0, max: 0 };
    }

    const target = previous.currentSize() !== null ? previous : panel;

    // An unbounded panel can still only grow to the width of the row it is in,
    // and a screen reader announcing MAX_SAFE_INTEGER helps nobody.
    const bound = this._containerSize() || target.max();

    return {
      now: Math.round(target.currentSize() ?? 0),
      min: Math.round(target.min()),
      max: Math.round(Math.min(target.max(), bound)),
    };
  }

  public dragStart(panel: IFsResizePanel): void {
    const previous = this._panelBefore(panel);

    if (!previous || this.disabled()) {
      return;
    }

    this._drag = this._resolveDrag(previous, panel);
  }

  public dragMove(panel: IFsResizePanel, delta: number): void {
    const drag = this._drag;

    // A move can outlive its handle — a panel removed mid-drag, a second handle
    // touched before the first released. Only the drag we opened may move.
    if (!drag || drag.origin !== panel) {
      return;
    }

    drag.target.setSize(this._clampDrag(drag, delta));
  }

  public dragEnd(): void {
    if (!this._drag) {
      return;
    }

    this._drag = null;
    this._publish();
  }

  public dragReset(panel: IFsResizePanel): void {
    const previous = this._panelBefore(panel);

    if (!previous || this.disabled()) {
      return;
    }

    // Both sides, because a drag only ever moved one of them and which one is
    // not something the person double-clicking the seam should have to know.
    previous.reset();
    panel.reset();
    this._publish();
  }

  private _panelBefore(panel: IFsResizePanel): IFsResizePanel | null {
    const panels = this.panels();
    const index = panels.indexOf(panel as FsResizePanelComponent);

    return index > 0 ? panels[index - 1] : null;
  }

  /**
   * Decide which of the two panels a drag actually moves.
   *
   * Prefer the fixed one: sizing the flexible panel would make it fixed too, and
   * a layout whose panels are all fixed has nothing left to absorb a window
   * resize. Only when both are flexible does the leading one get pinned, at
   * whatever size it happens to be showing.
   */
  private _resolveDrag(previous: IFsResizePanel, panel: IFsResizePanel): IResizeDrag {
    const previousSize = previous.measure();
    const panelSize = panel.measure();
    const targetIsPrevious = previous.currentSize() !== null || panel.currentSize() === null;

    return {
      origin: panel,
      target: targetIsPrevious ? previous : panel,
      other: targetIsPrevious ? panel : previous,
      // Dragging right grows the panel on the left and shrinks the one on the
      // right, so which way the pointer moves the target depends on which it is.
      sign: targetIsPrevious ? 1 : -1,
      targetStart: targetIsPrevious ? previousSize : panelSize,
      otherStart: targetIsPrevious ? panelSize : previousSize,
    };
  }

  private _clampDrag(drag: IResizeDrag, delta: number): number {
    // The seam cannot create or destroy space: whatever the target gains, its
    // neighbour loses, so the pair always adds up to what they started at.
    const total = drag.targetStart + drag.otherStart;

    let size = drag.targetStart + (drag.sign * delta);

    // The target's own limits.
    size = Math.max(drag.target.min(), Math.min(size, drag.target.max()));

    // And the neighbour's, expressed as limits on the target.
    size = Math.min(size, total - drag.other.min());
    size = Math.max(size, total - drag.other.max());

    return Math.max(0, size);
  }

  private _publish(): void {
    const sizes = this.panels().map((panel) => panel.currentSize());

    this.sizesChange.emit(sizes);

    const key = this.persist();

    if (key && this._store) {
      this._store.set(key, sizes);
    }
  }

  private _restore(): void {
    const key = this.persist();

    if (!key || !this._store) {
      return;
    }

    const sizes = this._store.get(key) as (number | null)[];
    const panels = this.panels();

    // A saved layout only applies to the layout it was saved from. Adding or
    // removing a panel since would otherwise restore sizes onto the wrong ones.
    if (!Array.isArray(sizes) || sizes.length !== panels.length) {
      return;
    }

    sizes.forEach((size, index) => panels[index].setSize(size));
  }

  private _observeContainer(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    // Outside Angular: this fires on every frame of a window drag, and the
    // panels apply their new size to the DOM directly.
    this._ngZone.runOutsideAngular(() => {
      this._observer = new ResizeObserver((entries) => {
        const size = this._entrySize(entries[0]);

        // Clamping resizes the panels, which can resize the container when its
        // own box is content-sized. Ignoring an unchanged measurement breaks
        // that loop before the browser has to.
        if (size === this._containerSize()) {
          return;
        }

        this._containerSize.set(size);
        this._clampToContainer(size);
      });

      this._observer.observe(this._elementRef.nativeElement);
    });
  }

  private _entrySize(entry: ResizeObserverEntry): number {
    return this.orientation() === 'horizontal'
      ? entry.contentRect.width
      : entry.contentRect.height;
  }

  /**
   * Fixed panels keep their pixels while the container shrinks, so past a point
   * the flexible ones are squeezed out and the row overflows its own box. Give
   * the overflow back by taking it off the fixed panels instead.
   */
  private _clampToContainer(available: number): void {
    const panels = this.panels();

    if (!panels.length) {
      return;
    }

    const fixed = panels.filter((panel) => panel.currentSize() !== null);
    const flexibleMin = panels
      .filter((panel) => panel.currentSize() === null)
      .reduce((total, panel) => total + panel.min(), 0);
    const claimed = fixed.reduce((total, panel) => total + panel.currentSize(), 0);
    const excess = claimed + flexibleMin - available;

    if (excess <= 0) {
      return;
    }

    // Shared out in proportion to how much each fixed panel can spare, so one
    // narrow panel is not collapsed to its minimum while a wide one keeps
    // everything it has.
    const room = fixed.map((panel) => Math.max(0, panel.currentSize() - panel.min()));
    const spare = room.reduce((total, panelRoom) => total + panelRoom, 0);

    if (spare <= 0) {
      return;
    }

    const ratio = Math.min(1, excess / spare);

    fixed.forEach((panel, index) => panel.setSize(panel.currentSize() - (room[index] * ratio)));
  }

}
