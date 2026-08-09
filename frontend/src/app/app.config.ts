import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import localeTr from '@angular/common/locales/tr';
import { registerLocaleData } from '@angular/common';

import { routes } from './app.routes';

import { httpProblemInterceptor } from '../app/core/interceptors/http-problem-interceptor';
import { authInterceptor } from '../app/core/interceptors/auth.interceptor';

registerLocaleData(localeTr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,          // Auth interceptor ÖNCE (token ekler)
        httpProblemInterceptor    // Problem interceptor SONRA (hata yakalar)
      ])),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'tr' },
  ]
};
