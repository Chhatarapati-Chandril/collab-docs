import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { appLogger } from '../utils/app-logger.util';
import { Notifier } from '../../shared/services/notifier';
import { NOTIFIER_CONSTANTS } from '../../shared/services/notifier.constants';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
    const notifier = inject(Notifier);
    const startTime = performance.now();
    appLogger.info(`→ ${req.method} ${req.urlWithParams}`);

    return next(req).pipe(
        tap({
            next: (event) => {
                // HttpResponse has a 'status' property; intermediate events (upload progress etc.) don't
                if ('status' in event) {
                    const duration = Math.round(performance.now() - startTime);
                    appLogger.success(
                        `← ${req.method} ${req.url} (${event.status}) [${duration}ms]`,
                    );
                }
            },
            error: (err: unknown) => {
                const duration = Math.round(performance.now() - startTime);
                if (err instanceof HttpErrorResponse) {
                    appLogger.error(`← ${req.method} ${req.url} (${err.status}) [${duration}ms]`);

                    if (err.status === 0 || err.status >= 500) {
                        notifier.showError(NOTIFIER_CONSTANTS.genericErrorMessage);
                    }
                } else {
                    appLogger.error(`← ${req.method} ${req.url} failed [${duration}ms]`);
                }
            },
        }),
    );
};
