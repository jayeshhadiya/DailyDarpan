import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeGu from '@angular/common/locales/gu';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withEnabledBlockingInitialNavigation, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';

// Gujarati month and weekday names for the date pipe.
registerLocaleData(localeGu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes,
      // Route data (the day's questions) arrives as component inputs.
      withComponentInputBinding(),
      // Wait for the first page's data before hydrating, so it matches the prerendered HTML.
      withEnabledBlockingInitialNavigation(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
  ]
};
