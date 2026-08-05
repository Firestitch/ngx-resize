import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { FsResizeModule } from '@firestitch/resize';


/**
 * The shape this package was built for: a fixed navigation rail beside a preview
 * that takes everything else, with the seam between them dragged to trade space.
 *
 * Persisted, so the width survives a reload — drag it, refresh the page, and it
 * comes back where you left it.
 */
@Component({
  selector: 'example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FsResizeModule],
})
export class ExampleComponent {

  public screens = [
    'Sign in', 'Dashboard', 'Projects', 'Project detail',
    'Design workspace', 'Settings', 'Billing',
  ];

  public sizes = signal<(number | null)[]>([]);

}
