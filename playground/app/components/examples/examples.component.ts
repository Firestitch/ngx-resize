import { Component } from '@angular/core';

import { FsExampleModule } from '@firestitch/example';

import { environment } from '../../../environments/environment';
import { ExampleColumnsComponent } from '../example-columns/example-columns.component';
import { ExampleNestedComponent } from '../example-nested/example-nested.component';
import { ExampleVerticalComponent } from '../example-vertical/example-vertical.component';
import { ExampleComponent } from '../example/example.component';


@Component({
  templateUrl: 'examples.component.html',
  standalone: true,
  imports: [
    FsExampleModule,
    ExampleComponent,
    ExampleColumnsComponent,
    ExampleVerticalComponent,
    ExampleNestedComponent,
  ],
})
export class ExamplesComponent {
  public config = environment;
}
