import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FsResizeModule } from '@firestitch/resize';


@Component({
  standalone: true,
  imports: [FsResizeModule],
  template: `
    <fs-resize
        [orientation]="orientation"
        [disabled]="disabled"
        [step]="20"
        style="width: 800px; height: 300px;">
      <fs-resize-panel
          [size]="200"
          [min]="100"
          [max]="400">
        <div>first</div>
      </fs-resize-panel>
      <fs-resize-panel [min]="150">
        <div>second</div>
      </fs-resize-panel>
    </fs-resize>
  `,
})
class HostComponent {
  public orientation: 'horizontal' | 'vertical' = 'horizontal';
  public disabled = false;
}


/**
 * Pointer capture rejects a pointerId that never really went down, which is
 * every id a test can invent. Stubbing the three capture calls lets the handle
 * run its normal path against synthetic events.
 */
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


describe('fs-resize', () => {

  let fixture: ComponentFixture<HostComponent>;

  const panels = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('fs-resize-panel'));

  const handles = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('fs-resize-handle'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders a handle on every panel but the first', () => {
    expect(panels().length).toBe(2);
    expect(handles().length).toBe(1);
    expect(panels()[0].querySelector('fs-resize-handle')).toBeNull();
    expect(panels()[1].querySelector('fs-resize-handle')).not.toBeNull();
  });

  it('lays the panels out at their declared and flexible sizes', () => {
    expect(panels()[0].getBoundingClientRect().width).toBe(200);
    expect(panels()[1].getBoundingClientRect().width).toBe(600);
  });

  it('grows the fixed panel when the handle is dragged away from it', () => {
    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 320);
    fixture.detectChanges();

    expect(panels()[0].getBoundingClientRect().width).toBe(320);
    // Whatever the fixed panel gains, the flexible one gives up.
    expect(panels()[1].getBoundingClientRect().width).toBe(480);
  });

  it('stops at the dragged panel\'s own minimum', () => {
    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 20);
    fixture.detectChanges();

    expect(panels()[0].getBoundingClientRect().width).toBe(100);
  });

  it('stops at the dragged panel\'s own maximum', () => {
    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 700);
    fixture.detectChanges();

    // Capped at 400 by its own max, well before the neighbour's min of 150
    // would have stopped it at 650.
    expect(panels()[0].getBoundingClientRect().width).toBe(400);
  });

  it('stops at the neighbour\'s minimum', async () => {
    // Raising the max takes the panel's own limit out of the way, leaving the
    // neighbour's min of 150 as the only thing that can stop the drag.
    fixture.componentInstance.orientation = 'horizontal';
    const container = fixture.nativeElement.querySelector('fs-resize');
    container.style.width = '500px';
    fixture.detectChanges();

    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 480);
    fixture.detectChanges();

    // 500 wide, neighbour keeps 150, so the fixed panel can reach 350 — except
    // its own max of 400 is higher, so the neighbour is what binds here.
    expect(panels()[0].getBoundingClientRect().width).toBe(350);
    expect(panels()[1].getBoundingClientRect().width).toBe(150);
  });

  it('does nothing while disabled', () => {
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 320);
    fixture.detectChanges();

    expect(panels()[0].getBoundingClientRect().width).toBe(200);
    expect(handle.getAttribute('aria-disabled')).toBe('true');
  });

  it('moves by one step per arrow key, along the layout\'s axis', () => {
    const handle = handles()[0];

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(220);

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(200);

    // Up and down belong to a stacked layout and must not move a row.
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(200);
  });

  it('runs to the limits on Home and End', () => {
    const handle = handles()[0];

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(400);

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(100);
  });

  it('returns to the declared size on Enter and on double-click', () => {
    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 320);
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(320);

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(200);

    drag(handle, 200, 320);
    fixture.detectChanges();
    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    expect(panels()[0].getBoundingClientRect().width).toBe(200);
  });

  it('does not keep the handle focused after a mouse drag', () => {
    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 320);
    fixture.detectChanges();

    // Focusing it here would leave the focus treatment lit after the button came
    // up — Chrome matches :focus-visible on a programmatically focused tabindex
    // element, so the seam stayed highlighted with the pointer nowhere near it.
    expect(document.activeElement).not.toBe(handle);
    expect(handle.classList.contains('fs-resize-resizing')).toBe(false);
    expect(document.body.classList.contains('fs-resize-resizing')).toBe(false);
  });

  it('reports itself to assistive tech as a separator across the layout', () => {
    const handle = handles()[0];

    expect(handle.getAttribute('role')).toBe('separator');
    // Panels side by side are divided by a vertical bar.
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('200');
    expect(handle.getAttribute('aria-valuemin')).toBe('100');
    expect(handle.getAttribute('aria-valuemax')).toBe('400');
    expect(handle.getAttribute('tabindex')).toBe('0');
  });

  it('resizes heights and flips the separator when stacked', () => {
    fixture.componentInstance.orientation = 'vertical';

    // Taller than the 300px the row case uses: stacked, the second panel's min
    // of 150 has to fit alongside the first, or every drag is pinned by it.
    const container = fixture.nativeElement.querySelector('fs-resize');

    container.style.height = '500px';
    fixture.detectChanges();

    const handle = handles()[0];

    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');

    stubPointerCapture(handle);
    drag(handle, 200, 260, true);
    fixture.detectChanges();

    expect(panels()[0].getBoundingClientRect().height).toBe(260);
    expect(panels()[1].getBoundingClientRect().height).toBe(240);
  });

  it('refuses a drag that would take the neighbour below its minimum', () => {
    // 300 tall, so the flexible panel is already at 100 against a min of 150.
    // The seam cannot make that worse, and moving it at all restores the min.
    fixture.componentInstance.orientation = 'vertical';
    fixture.detectChanges();

    const handle = handles()[0];

    stubPointerCapture(handle);
    drag(handle, 200, 260, true);
    fixture.detectChanges();

    expect(panels()[0].getBoundingClientRect().height).toBe(150);
    expect(panels()[1].getBoundingClientRect().height).toBe(150);
  });

});
