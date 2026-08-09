import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// ✅ AG Grid v34 module registration (Community)
ModuleRegistry.registerModules([AllCommunityModule]);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
