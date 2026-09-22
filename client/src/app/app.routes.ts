import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { noAuthGuard } from './core/guards/no-auth-guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login').then((m) => m.Login),
        canActivate: [noAuthGuard],
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/register/register').then((m) => m.Register),
        canActivate: [noAuthGuard],
    },
    {
        path: '',
        loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
        canActivate: [authGuard],
        children: [
            { path: 'home', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
            {
                path: 'editor/:id',
                loadComponent: () => import('./pages/editor/editor').then((m) => m.Editor),
            },
            {
                path: 'profile',
                loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
            },
            {
                path: 'notifications',
                loadComponent: () =>
                    import('./pages/notifications/notifications').then((m) => m.Notifications),
            },
            { path: '', pathMatch: 'full', redirectTo: 'home' },
        ],
    },
    { path: '**', redirectTo: 'home' },
];
