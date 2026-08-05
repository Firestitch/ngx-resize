import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FsResizeModule } from '@firestitch/resize';


/**
 * The same thing turned through 90 degrees — a console over a terminal.
 *
 * Only `orientation` changes. Sizes become heights, the seam is dragged up and
 * down, and the handle reports itself to a screen reader as a horizontal
 * separator rather than a vertical one.
 */
@Component({
  selector: 'example-vertical',
  templateUrl: './example-vertical.component.html',
  styleUrls: ['./example-vertical.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FsResizeModule],
})
export class ExampleVerticalComponent {
}
