import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FsResizeModule } from '@firestitch/resize';


/**
 * Three panels with the flexible one in the middle — the editor layout.
 *
 * Each seam moves the fixed panel beside it, so the left handle widens the tree
 * and the right handle widens the inspector, and the middle gives up the space
 * both times. Nothing here says so: the container works out which side of a seam
 * can absorb the change.
 */
@Component({
  selector: 'example-columns',
  templateUrl: './example-columns.component.html',
  styleUrls: ['./example-columns.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FsResizeModule],
})
export class ExampleColumnsComponent {
}
