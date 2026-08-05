import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { FsResizeContainer, IFsResizePanel } from '../../classes/resize-container';
import { FsResizeOrientation } from '../../types/resize-orientation.type';
import { FsResizeHandleComponent } from '../resize-handle/resize-handle.component';


/**
 * One panel of a `<fs-resize>` layout.
 *
 * A panel that declares a `size` is FIXED: it keeps that size while the
 * container grows and shrinks, and dragging a handle beside it is what changes
 * it. A panel with no `size` is FLEXIBLE and absorbs whatever the fixed panels
 * leave over — a container wants at least one, or resizing the window has
 * nowhere to put the difference.
 *
 * The panel renders the handle on its own LEADING edge rather than the container
 * rendering handles between projected children. Content projection cannot
 * interleave anything into what it projects, and having each panel own the seam
 * in front of it costs the layout nothing: the handle is positioned absolutely
 * on the boundary, so the panels still meet edge to edge.
 */
@Component({
  selector: 'fs-resize-panel',
  templateUrl: './resize-panel.component.html',
  styleUrls: ['./resize-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FsResizeHandleComponent],
  host: {
    'class': 'fs-resize-panel',
  },
})
export class FsResizePanelComponent implements IFsResizePanel {

  /**
   * Starting size along the container's axis, in pixels. Omit it to make the
   * panel flexible. This is also the size a reset — a double-click or Enter on
   * the handle — goes back to.
   */
  public size = input<number | null>(null);

  public min = input<number>(0);
  public max = input<number>(Number.MAX_SAFE_INTEGER);

  /** False removes this panel's leading handle, pinning it to its neighbour. */
  public resizable = input<boolean>(true);

  /** Accessible name for the handle, for a layout with more than one. */
  public label = input<string>('Resize panel');

  public container = inject(FsResizeContainer);

  /**
   * The size in force right now — the declared one until a drag overrides it,
   * and `null` for as long as the panel is flexible.
   *
   * Kept as an override rather than a signal seeded from the input, because
   * seeding one signal from another means writing to it from an `effect`, which
   * Angular rejects (NG0600).
   */
  public currentSize = computed<number | null>(() => {
    const override = this._override();

    return override === undefined ? this.size() : override;
  });

  public hasHandle = computed<boolean>(() => this.container.hasHandle(this));
  public aria = computed(() => this.container.handleAria(this));

  private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private _renderer = inject(Renderer2);

  /** `undefined` means "no drag has happened — follow the declared size". */
  private _override = signal<number | null | undefined>(undefined);

  constructor() {
    // Re-applied on orientation changes too: a fixed panel constrains its width
    // in a row and its height in a column, and the other one has to be released.
    effect(() => this._applySize(this.currentSize(), this.container.orientation()));
  }

  public get element(): HTMLElement {
    return this._elementRef.nativeElement;
  }

  public setSize(size: number | null): void {
    this._override.set(size);

    // Written straight to the element as well as through the signal. A drag
    // applies a new size on every pointer frame from outside the Angular zone,
    // where the change detection that would flush the signal is not guaranteed
    // to have run before the browser paints.
    this._applySize(size, this.container.orientation());
  }

  /** Drop back to the declared `size`, whatever dragging has done since. */
  public reset(): void {
    this._override.set(undefined);
    this._applySize(this.size(), this.container.orientation());
  }

  /** The panel's rendered size along the container's axis. */
  public measure(): number {
    const rect = this.element.getBoundingClientRect();

    return this.container.orientation() === 'horizontal' ? rect.width : rect.height;
  }

  private _applySize(size: number | null, orientation: FsResizeOrientation): void {
    const horizontal = orientation === 'horizontal';
    const axis = horizontal ? 'width' : 'height';
    const crossAxis = horizontal ? 'height' : 'width';

    // The cross axis is always released, or a panel sized in a row keeps that
    // value as a height once the container turns into a column.
    this._renderer.removeStyle(this.element, crossAxis);

    if (size === null) {
      this._renderer.removeStyle(this.element, axis);
      this._renderer.setStyle(this.element, 'flex', '1 1 0');

      return;
    }

    // An explicit width/height rather than a flex-basis, so the value stays
    // readable from the element's own style and survives flex resolution.
    this._renderer.setStyle(this.element, 'flex', '0 0 auto');
    this._renderer.setStyle(this.element, axis, `${size}px`);
  }

}
