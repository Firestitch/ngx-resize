import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FsResizeModule } from '@firestitch/resize';


@Component({
  standalone: true,
  imports: [FsResizeModule],
  template: `
    <div style="width: 800px; height: 300px; display: flex;">
      <div
          [fsResizeEdge]="edge"
          [size]="200"
          [min]="120"
          [max]="400"
          [step]="20"
          [disabled]="disabled"
          style="flex: 0 0 auto;">
        nav
      </div>
      <div style="flex: 1;">content</div>
    </div>
  `,
})
class HostComponent {
  public edge: 'left' | 'right' | 'top' | 'bottom' = 'right';
  public disabled = false;
}


function stubPointerCapture(element: HTMLElement): void {
  element.setPointerCapture = () => undefined;
  element.releasePointerCapture = () => undefined;
  element.hasPointerCapture = () => false;
}

function drag(handle: HTMLElement, from: number, to: number, vertical = false): void {
  const at = (value: number) => vertical
    ? { clientX: 0, clientY: value }
    : { clientX: value, clientY: 0 };

  handle.dispatchEvent(new PointerEvent('pointerdown', { ...at(from), pointerId: 1, bubbles: true }));
  handle.dispatchEvent(new PointerEvent('pointermove', { ...at(to), pointerId: 1, bubbles: true }));
  handle.dispatchEvent(new PointerEvent('pointerup', { ...at(to), pointerId: 1, bubbles: true }));
}


describe('fsResizeEdge', () => {

  let fixture: ComponentFixture<HostComponent>;

  // The directive's own class, not `[fsResizeEdge]` — Angular strips a binding
  // attribute from the DOM, so there is nothing there to select on.
  const target = (): HTMLElement => fixture.nativeElement.querySelector('.fs-resize-edge');
  const handle = (): HTMLElement => fixture.nativeElement.querySelector('fs-resize-handle');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('places a handle inside the element, on the named edge', () => {
    expect(handle()).not.toBeNull();
    // Inside the element it resizes, not beside it — the view container would
    // have created it as a sibling.
    expect(target().contains(handle())).toBe(true);
    expect(handle().classList.contains('fs-resize-handle-right')).toBe(true);
  });

  it('starts at the declared size', () => {
    expect(target().getBoundingClientRect().width).toBe(200);
  });

  it('grows when a right edge is dragged right', () => {
    stubPointerCapture(handle());
    drag(handle(), 200, 300);
    fixture.detectChanges();

    expect(target().getBoundingClientRect().width).toBe(300);
  });

  it('grows when a left edge is dragged left', () => {
    fixture.componentInstance.edge = 'left';
    fixture.detectChanges();

    stubPointerCapture(handle());
    // Dragging a left edge outward moves the pointer toward smaller
    // coordinates, so the same gesture has to read the other way round.
    drag(handle(), 200, 120);
    fixture.detectChanges();

    expect(target().getBoundingClientRect().width).toBe(280);
  });

  it('clamps to min and max', () => {
    stubPointerCapture(handle());

    drag(handle(), 200, 20);
    fixture.detectChanges();
    expect(target().getBoundingClientRect().width).toBe(120);

    drag(handle(), 120, 900);
    fixture.detectChanges();
    expect(target().getBoundingClientRect().width).toBe(400);
  });

  it('does nothing while disabled', () => {
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    stubPointerCapture(handle());
    drag(handle(), 200, 320);
    fixture.detectChanges();

    expect(target().getBoundingClientRect().width).toBe(200);
  });

  it('moves by one step per arrow key and resets on Enter', () => {
    handle().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(target().getBoundingClientRect().width).toBe(220);

    handle().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(target().getBoundingClientRect().width).toBe(200);
  });

  it('reports itself as a separator with the element\'s size', () => {
    expect(handle().getAttribute('role')).toBe('separator');
    expect(handle().getAttribute('aria-orientation')).toBe('vertical');
    expect(handle().getAttribute('aria-valuenow')).toBe('200');
    expect(handle().getAttribute('aria-valuemin')).toBe('120');
    expect(handle().getAttribute('aria-valuemax')).toBe('400');
  });

  it('drives height, not width, on a bottom edge', () => {
    fixture.componentInstance.edge = 'bottom';
    fixture.detectChanges();
    // The handle is created dynamically, so the directive pushes the new edge
    // into it with setInput from an effect — which runs after the pass that
    // triggered it. Its own host bindings flush on the next one.
    fixture.detectChanges();

    expect(handle().getAttribute('aria-orientation')).toBe('horizontal');

    stubPointerCapture(handle());
    drag(handle(), 200, 260, true);
    fixture.detectChanges();

    expect(target().getBoundingClientRect().height).toBe(260);
  });

});
