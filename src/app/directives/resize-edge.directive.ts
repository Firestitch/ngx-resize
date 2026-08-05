import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { FsStore } from '@firestitch/store';

import { FsResizeHandleComponent } from '../components/resize-handle/resize-handle.component';
import { FsResizeEdge, resizeEdgeOrientation } from '../types/resize-orientation.type';


/**
 * Drag one element's own edge to resize it.
 *
 * The companion to `<fs-resize>`, and the difference is what is on the other
 * side of the line. A panel shares a seam with a sibling and the two trade space
 * between them. This is for a box with no sibling to trade with — a side nav
 * against the page, a drawer against the window — where the edge is the outside
 * of the element and the space it takes comes from the layout around it.
 *
 * ```html
 * <mat-sidenav
 *     [fsResizeEdge]="'right'"
 *     [size]="200"
 *     [min]="160"
 *     [max]="400"
 *     [persist]="'side-nav'">
 * ```
 *
 * The handle is created and placed on the named edge; there is nothing to write
 * in the template. The host is given `position: relative` if it has no
 * positioning of its own, because the handle is positioned against it.
 */
@Directive({
  selector: '[fsResizeEdge]',
  standalone: true,
  host: {
    'class': 'fs-resize-edge',
  },
})
export class FsResizeEdgeDirective implements OnInit, OnDestroy {

  /** Which side of this element is dragged. */
  public edge = input.required<FsResizeEdge>({ alias: 'fsResizeEdge' });

  /**
   * Starting size along the drag axis, in pixels — a width for a left or right
   * edge, a height for a top or bottom one. Omit it to measure the element as
   * rendered and start from there. This is also the size a reset goes back to.
   */
  public size = input<number | null>(null);

  public min = input<number>(0);
  public max = input<number>(Number.MAX_SAFE_INTEGER);
  public disabled = input<boolean>(false);

  /** How far one arrow-key press moves the edge, in pixels. */
  public step = input<number>(10);

  /** Remember the size under this key, across reloads, through `FsStore`. */
  public persist = input<string | null>(null);

  /** Accessible name for the handle. */
  public label = input<string>('Resize');

  public sizeChange = output<number>();

  /** The size in force right now, `null` until the element has been measured. */
  public currentSize = signal<number | null>(null);

  private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private _renderer = inject(Renderer2);
  private _viewContainerRef = inject(ViewContainerRef);

  // Optional injection so an element that never sets `persist` does not have to
  // provide FsStoreModule.
  private _store = inject(FsStore, { optional: true });

  private _handle = this._viewContainerRef.createComponent(FsResizeHandleComponent);
  private _orientation = computed(() => resizeEdgeOrientation(this.edge()));
  private _startSize = 0;

  constructor() {
    // Created as a sibling by the view container, then moved inside the host, so
    // the handle sits against the element it resizes rather than beside it. The
    // component stays attached to the view hierarchy either way, which is what
    // keeps its own change detection and teardown working.
    this._renderer.appendChild(this._element, this._handle.location.nativeElement);

    this._wireHandle();

    effect(() => this._applySize(this.currentSize()));
    effect(() => this._syncHandle());
  }

  public ngOnInit(): void {
    // After the element has been laid out at least once: without a declared
    // size the starting point is whatever the stylesheet gave it, which cannot
    // be read before then.
    this.currentSize.set(this._restore() ?? this.size() ?? this._measure());
    this._ensurePositioned();
  }

  public ngOnDestroy(): void {
    this._handle.destroy();
  }

  public setSize(size: number): void {
    const clamped = Math.max(0, Math.max(this.min(), Math.min(size, this.max())));

    this.currentSize.set(clamped);

    // Written straight to the element as well as through the signal. A drag
    // applies a new size on every pointer frame from outside the Angular zone,
    // where the change detection that would flush the signal is not guaranteed
    // to have run before the browser paints.
    this._applySize(clamped);
  }

  /** Drop back to the declared `size`, or to what the stylesheet gave it. */
  public reset(): void {
    this._renderer.removeStyle(this._element, this._axis());
    this.setSize(this.size() ?? this._measure());
    this._publish();
  }

  private get _element(): HTMLElement {
    return this._elementRef.nativeElement;
  }

  private _wireHandle(): void {
    const handle = this._handle.instance;

    handle.resizeStart.subscribe(() => {
      this._startSize = this._measure();
    });

    handle.resize.subscribe((delta: number) => {
      if (this.disabled()) {
        return;
      }

      // Dragging a left or top edge outward moves the pointer toward negative
      // coordinates, so the delta has to be read the other way round.
      const grows = this.edge() === 'right' || this.edge() === 'bottom' ? 1 : -1;

      this.setSize(this._startSize + (grows * delta));
    });

    handle.resizeEnd.subscribe(() => this._publish());
    handle.reset.subscribe(() => this.reset());
  }

  private _syncHandle(): void {
    this._handle.setInput('placement', this.edge());
    this._handle.setInput('disabled', this.disabled());
    this._handle.setInput('step', this.step());
    this._handle.setInput('label', this.label());
    this._handle.setInput('valueNow', Math.round(this.currentSize() ?? 0));
    this._handle.setInput('valueMin', Math.round(this.min()));
    this._handle.setInput('valueMax', Math.round(this.max()));
  }

  private _axis(): 'width' | 'height' {
    return this._orientation() === 'horizontal' ? 'width' : 'height';
  }

  private _measure(): number {
    const rect = this._element.getBoundingClientRect();

    return this._orientation() === 'horizontal' ? rect.width : rect.height;
  }

  private _applySize(size: number | null): void {
    if (size === null) {
      return;
    }

    this._renderer.setStyle(this._element, this._axis(), `${size}px`);
  }

  /**
   * The handle is absolutely positioned against this element, so the element has
   * to be a containing block. Left alone if it already is — a fixed drawer or an
   * absolutely placed panel positions itself, and overwriting that would move it.
   */
  private _ensurePositioned(): void {
    if (getComputedStyle(this._element).position === 'static') {
      this._renderer.setStyle(this._element, 'position', 'relative');
    }
  }

  private _publish(): void {
    const size = this.currentSize();

    if (size === null) {
      return;
    }

    this.sizeChange.emit(size);

    const key = this.persist();

    if (key && this._store) {
      this._store.set(key, size);
    }
  }

  private _restore(): number | null {
    const key = this.persist();

    if (!key || !this._store) {
      return null;
    }

    const size = this._store.get(key) as number;

    return typeof size === 'number' && size > 0 ? size : null;
  }

}
