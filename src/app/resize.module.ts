import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { FsResizeComponent } from './components/resize/resize.component';
import { FsResizePanelComponent } from './components/resize-panel/resize-panel.component';


/**
 * The handle is deliberately not exported. Each panel renders the one on its own
 * leading edge, and a hand-written handle would sit in the flow rather than on
 * the seam — see `FsResizePanelComponent`.
 */
@NgModule({
  imports: [
    CommonModule,
    FsResizeComponent,
    FsResizePanelComponent,
  ],
  exports: [
    FsResizeComponent,
    FsResizePanelComponent,
  ],
})
export class FsResizeModule {
  public static forRoot(): ModuleWithProviders<FsResizeModule> {
    return {
      ngModule: FsResizeModule,
    };
  }
}
