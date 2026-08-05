import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  Renderer2,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
} from '@angular/core';

import {
  FsResizeEdge,
  FsResizeOrientation,
  resizeEdgeOrientation,
} from '../../types/resize-orientation.type';


/**
 * Set on the handle and on `<body>` for the duration of a drag. A drag routinely
 * takes the pointer off the handle and across the page, where it would otherwise
 * pick up whatever cursor lives there and select text as it sweeps. The class on
 * the handle also keeps the highlight lit once `:hover` has dropped.
 */
const RESIZING_CLASS = 'fs-resize-resizing';

/** Added alongside it for a vertical drag, where the cursor is `row-resize`. */
const ROW_RESIZING_CLASS = 'fs-resize-resizing-row';

/** Home/End run the handle to the far end and let the caller clamp it. */
const TO_THE_END = Number.MAX_SAFE_INTEGER;


/**
 * The draggable edge of a box.
 *
 * Never written by hand. A panel renders one on the edge that faces its
 * neighbour, and `[fsResizeEdge]` renders one on the outside of a lone element.
 * It reports movement as a pixel delta from where the drag started and knows
 * nothing about sizes; whatever created it owns that.
 */
@Component({
  selector: 'fs-resize-handle',
  template: '',
  styleUrls: ['./resize-handle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The drag pins a cursor and kills text selection on `<body>`, which a scoped
  // stylesheet cannot reach. Everything here is namespaced under
  // `.fs-resize-*`, so going global costs nothing else.
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  host: {
    'class': 'fs-resize-handle',
    'role': 'separator',
    // One binding per placement rather than `[class]="'…-' + placement()"`,
    // which replaces the whole class list and would wipe both the base class
    // and the resizing class the drag adds imperatively.
    '[class.fs-resize-handle-left]': 'placement() === \'left\'',
    '[class.fs-resize-handle-right]': 'placement() === \'right\'',
    '[class.fs-resize-handle-top]': 'placement() === \'top\'',
    '[class.fs-resize-handle-bottom]': 'placement() === \'bottom\'',
    '[attr.tabindex]': 'disabled() ? null : 0',
    '[attr.aria-orientation]': 'ariaOrientation()',
    '[attr.aria-valuenow]': 'valueNow()',
    '[attr.aria-valuemin]': 'valueMin()',
    '[attr.aria-valuemax]': 'valueMax()',
    '[attr.aria-label]': 'label()',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(pointerdown)': '_pointerDown($event)',
    '(keydown)': '_keyDown($event)',
    '(dblclick)': 'reset.emit()',
  },
})
export class FsResizeHandleComponent implements OnDestroy {

  /** Which side of its box this handle sits on. */
  public placement = input<FsResizeEdge>('left');

  public disabled = input<boolean>(false);
  public step = input<number>(10);
  public label = input<string>('Resize');

  /** Live size of whatever this handle resizes, for `role="separator"`. */
  public valueNow = input<number>(0);
  public valueMin = input<number>(0);
  public valueMax = input<number>(0);

  public resizeStart = output<void>();

  /** Pixels moved along the drag axis since `resizeStart`. */
  public resize = output<number>();

  public resizeEnd = output<void>();
  public reset = output<void>();

  public orientation = computed<FsResizeOrientation>(
    () => resizeEdgeOrientation(this.placement()),
  );

  /**
   * ARIA names the separator, not the layout it sits in: boxes side by side are
   * divided by a VERTICAL bar. `role="separator"` defaults to horizontal, so
   * this has to be stated either way round.
   */
  public ariaOrientation = computed<FsResizeOrientation>(
    () => this.orientation() === 'horizontal' ? 'vertical' : 'horizontal',
  );

  private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private _renderer = inject(Renderer2);
  private _ngZone = inject(NgZone);

  private _moveHandler = this._pointerMove.bind(this);
  private _endHandler = this._pointerUp.bind(this);
  private _origin = 0;
  private _pointerId: number | null = null;

  /**
   * A drag can be interrupted by the handle being removed — a collapsed section,
   * a closed drawer — which never fires pointerup and would leave the page
   * pinned to a resize cursor with nothing left to clear it.
   */
  public ngOnDestroy(): void {
    this._stopDragging();
  }

  private get _element(): HTMLElement {
    return this._elementRef.nativeElement;
  }

  // Protected rather than private: these are referenced from the host bindings
  // above, which resolve against the component's template context.
  protected _pointerDown(event: PointerEvent): void {
    if (this.disabled()) {
      return;
    }

    // Stops the press starting a text selection or a native image drag. It also
    // stops the handle taking focus, which is what we want: focusing it here
    // would leave the focus treatment lit after the mouse was released, and
    // Chrome matches `:focus-visible` on a programmatically focused tabindex
    // element. The drag does not need focus — pointer capture routes it — and a
    // keyboard user still reaches the handle with Tab, which is the only way it
    // should ever show a focus ring.
    event.preventDefault();

    this._origin = this._axisPosition(event);
    this._pointerId = event.pointerId;

    // Pointer capture routes every subsequent move and release back to this
    // element however far the pointer strays, so there are no document-level
    // listeners to attach, leak, or clean up on an interrupted drag.
    this._element.setPointerCapture(event.pointerId);
    this._setResizing(true);
    this.resizeStart.emit();

    // Outside Angular: a drag fires pointermove at screen rate, and each one
    // would otherwise run a change detection pass. The new size is applied to
    // the DOM directly, so nothing here needs one.
    this._ngZone.runOutsideAngular(() => {
      this._element.addEventListener('pointermove', this._moveHandler);
      this._element.addEventListener('pointerup', this._endHandler);
      this._element.addEventListener('pointercancel', this._endHandler);
    });
  }

  /**
   * Arrow keys nudge, Home/End run to the limits, Enter restores the declared
   * size. Each one is a whole gesture, so it opens and closes the same
   * start/move/end the pointer does and the caller needs no separate path.
   */
  protected _keyDown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    const horizontal = this.orientation() === 'horizontal';
    const decrease = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const increase = horizontal ? 'ArrowRight' : 'ArrowDown';

    let delta: number;

    switch (event.key) {
      case decrease: delta = -this.step(); break;
      case increase: delta = this.step(); break;
      case 'Home': delta = -TO_THE_END; break;
      case 'End': delta = TO_THE_END; break;
      case 'Enter': this.reset.emit(); event.preventDefault(); return;
      default: return;
    }

    // Otherwise the arrows scroll whatever is behind the handle at the same time.
    event.preventDefault();

    this.resizeStart.emit();
    this.resize.emit(delta);
    this.resizeEnd.emit();
  }

  private _pointerMove(event: PointerEvent): void {
    this.resize.emit(this._axisPosition(event) - this._origin);
  }

  private _pointerUp(): void {
    this._stopDragging();
    this._ngZone.run(() => this.resizeEnd.emit());
  }

  private _axisPosition(event: PointerEvent): number {
    return this.orientation() === 'horizontal' ? event.clientX : event.clientY;
  }

  private _stopDragging(): void {
    this._element.removeEventListener('pointermove', this._moveHandler);
    this._element.removeEventListener('pointerup', this._endHandler);
    this._element.removeEventListener('pointercancel', this._endHandler);

    if (this._pointerId !== null && this._element.hasPointerCapture(this._pointerId)) {
      this._element.releasePointerCapture(this._pointerId);
    }

    this._pointerId = null;
    this._setResizing(false);
  }

  private _setResizing(resizing: boolean): void {
    if (!resizing) {
      // Both come off unconditionally. Clearing only the one this axis added
      // would strand the other if the placement changed mid-drag.
      this._renderer.removeClass(this._element, RESIZING_CLASS);
      this._renderer.removeClass(document.body, RESIZING_CLASS);
      this._renderer.removeClass(document.body, ROW_RESIZING_CLASS);

      return;
    }

    this._renderer.addClass(this._element, RESIZING_CLASS);
    this._renderer.addClass(document.body, RESIZING_CLASS);

    // A vertical drag goes up and down, so the cursor pinned to the page for
    // the duration has to be the other one.
    if (this.orientation() === 'vertical') {
      this._renderer.addClass(document.body, ROW_RESIZING_CLASS);
    }
  }

}
