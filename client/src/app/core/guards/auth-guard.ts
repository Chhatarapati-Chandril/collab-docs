import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { AppBootstrap } from '../services/app-bootstrap';

export const authGuard: CanActivateFn = async () => {
    const authService = inject(Auth);
    const router = inject(Router);
    const bootstrap = inject(AppBootstrap);

    await bootstrap.readyPromise;

    if (authService.isAuthenticated()) return true;

    router.navigate(['/login']);
    return false;
};
