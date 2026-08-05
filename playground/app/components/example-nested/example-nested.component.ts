import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FsResizeModule } from '@firestitch/resize';


/**
 * A column inside a row — the IDE layout.
 *
 * Nothing special is needed for this: a panel is an ordinary box, so putting
 * another `<fs-resize>` in one works because the inner container measures itself
 * against the panel the same way the outer one measures itself against the page.
 */
@Component({
  selector: 'example-nested',
  templateUrl: './example-nested.component.html',
  styleUrls: ['./example-nested.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FsResizeModule],
})
export class ExampleNestedComponent {
}
