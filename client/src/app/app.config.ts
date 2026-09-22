import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firstValueFrom, catchError, of, tap } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { loggingInterceptor } from './core/interceptors/logging-interceptor';
import { Auth } from './core/services/auth';
import { AppBootstrap, SPLASH_SCREEN_MIN_DISPLAY_MS } from './core/services/app-bootstrap';
import { appLogger } from './core/utils/app-logger.util';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([loggingInterceptor, authInterceptor])),
        provideAnimationsAsync(),
        provideAppInitializer(() => {
            const authService = inject(Auth);
            const bootstrap = inject(AppBootstrap);

            appLogger.info('Connecting to backend...');
            const startTime = Date.now();

            // We do NOT return the promise here. Returning it would block the root component
            // from rendering entirely. We want the root component to render immediately so it
            // can show the splash screen while this async work finishes.
            firstValueFrom(
                authService.refreshAccessToken$().pipe(
                    tap(() => appLogger.success('Connected — session restored')),
                    catchError((err: unknown) => {
                        if (err instanceof HttpErrorResponse) {
                            if (err.status === 401) {
                                appLogger.success('Connected — no active session');
                            } else if (err.status === 0) {
                                appLogger.error('Backend unreachable — is the server running?');
                            } else {
                                appLogger.warn(`Connected — unexpected error (${err.status})`);
                            }
                        } else {
                            appLogger.error('Unexpected error during startup connection check');
                        }
                        return of(null);
                    }),
                ),
            ).finally(() => {
                const elapsed = Date.now() - startTime;
                const delay = Math.max(0, SPLASH_SCREEN_MIN_DISPLAY_MS - elapsed);
                setTimeout(() => bootstrap.setReady(), delay);
            });
        }),
    ],
};
