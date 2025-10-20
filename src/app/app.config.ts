import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { UsersService } from './service/users.service';
import { firstValueFrom } from 'rxjs';

function initUsers(usersService: UsersService) {
  // Return a function that resolves when loading completes
  return () => firstValueFrom(usersService.load());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    {
      provide: APP_INITIALIZER,
      useFactory: initUsers,
      deps: [UsersService],
      multi: true,
    },
  ]
};
