import { enableProdMode, importProvidersFrom } from '@angular/core';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes, provideRouter } from '@angular/router';

import { FsExampleModule } from '@firestitch/example';
import { FsMessageModule } from '@firestitch/message';
import { FsStoreModule } from '@firestitch/store';

import { ToastrModule } from 'ngx-toastr';

import { AppComponent } from './app/app.component';
import { ExamplesComponent } from './app/components';
import { environment } from './environments/environment';


const routes: Routes = [
  { path: '', component: ExamplesComponent },
];

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      // The persisted example writes its panel sizes through FsStore.
      FsStoreModule.forRoot(),
      FsExampleModule.forRoot(),
      ToastrModule.forRoot({ preventDuplicates: true }),
      FsMessageModule.forRoot(),
    ),
    provideAnimations(),
    provideRouter(routes),
  ],
})
  .catch((err) => console.error(err));
