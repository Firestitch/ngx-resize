import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { FsResizeComponent } from './components/resize/resize.component';
import { FsResizePanelComponent } from './components/resize-panel/resize-panel.component';
import { FsResizeEdgeDirective } from './directives/resize-edge.directive';


/**
 * Two primitives, and the difference is what is on the other side of the line.
 *
 * `<fs-resize>` + `<fs-resize-panel>` divide one box between siblings that trade
 * space with each other. `[fsResizeEdge]` drags the outside edge of a box that
 * has no sibling to trade with.
 *
 * The handle is deliberately not exported. Both primitives place their own, and
 * a hand-written one would sit in the flow rather than on the edge.
 */
@NgModule({
  imports: [
    CommonModule,
    FsResizeComponent,
    FsResizePanelComponent,
    FsResizeEdgeDirective,
  ],
  exports: [
    FsResizeComponent,
    FsResizePanelComponent,
    FsResizeEdgeDirective,
  ],
})
export class FsResizeModule {
  public static forRoot(): ModuleWithProviders<FsResizeModule> {
    return {
      ngModule: FsResizeModule,
    };
  }
}
