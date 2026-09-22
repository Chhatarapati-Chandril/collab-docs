import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from '../services/auth';
import { appLogger } from '../utils/app-logger.util';

const AUTH_EXCLUDED_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(Auth);
    const router = inject(Router);

    const isExcluded = AUTH_EXCLUDED_PATHS.some((path) => req.url.includes(path));
    const token = authService.accessToken;

    const authReq =
        !isExcluded && token
            ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            : req;

    return next(authReq).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401 && !isExcluded) {
                appLogger.warn(`401 on ${req.url} — attempting token refresh`);

                return authService.refreshAccessToken$().pipe(
                    switchMap((newToken) => {
                        appLogger.success('Token refreshed - retrying original request');
                        const retried = req.clone({
                            setHeaders: { Authorization: `Bearer ${newToken}` },
                        });
                        return next(retried);
                    }),
                    catchError((refreshError) => {
                        appLogger.error(
                            'Refresh failed — clearing session and redirecting to /login',
                        );
                        authService.clearSession();
                        router.navigate(['/login']);
                        return throwError(() => refreshError);
                    }),
                );
            }
            return throwError(() => error);
        }),
    );
};
