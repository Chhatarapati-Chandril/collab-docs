import { Component, computed, inject, OnInit, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { Auth } from '../../core/services/auth';
import { Notifications } from '../../core/services/notifications';
import { ThemeService, ThemeType } from '../../core/services/theme';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';
import { getColorForUser, getInitial } from '../utils/avatar.util';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [
        RouterLink,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatBadgeModule,
        MatTooltipModule,
        MatDividerModule,
    ],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
    @ViewChild('themeMenuTrigger') themeMenuTrigger?: MatMenuTrigger;

    private authService = inject(Auth);
    private notificationsService = inject(Notifications);
    private router = inject(Router);
    private dialog = inject(MatDialog);
    readonly themeService = inject(ThemeService);

    readonly user = this.authService.user;
    readonly userDisplayName = computed(() => this.user()?.displayName ?? '');
    readonly unreadCount = this.notificationsService.unreadCount;

    readonly getColorForUser = getColorForUser;
    readonly getInitial = getInitial;

    private longPressTimer: ReturnType<typeof setTimeout> | null = null;

    readonly themeIcon = computed<string>(() => {
        const current = this.themeService.themeSig();
        switch (current) {
            case 'light':
                // In light mode, show a Moon icon
                return 'dark_mode';
            case 'dark':
                // In dark mode, show a Sun icon
                return 'light_mode';
            case 'system':
            default:
                // In system mode, show a Monitor icon
                return 'desktop_windows';
        }
    });

    readonly themeTooltip = computed<string>(() => {
        const current = this.themeService.themeSig();
        switch (current) {
            case 'light':
                return 'Switch to dark mode (Right-click for options)';
            case 'dark':
                return 'Switch to light mode (Right-click for options)';
            case 'system':
            default:
                return 'Theme: Automatic / System. Click to choose theme';
        }
    });

    readonly themeAriaLabel = computed<string>(() => {
        const current = this.themeService.themeSig();
        switch (current) {
            case 'light':
                return 'Current mode: Light. Click to switch to Dark, or right-click for menu.';
            case 'dark':
                return 'Current mode: Dark. Click to switch to Light, or right-click for menu.';
            case 'system':
            default:
                return 'Current mode: Automatic / System. Click to choose theme.';
        }
    });

    onThemeButtonClick(): void {
        if (this.themeMenuTrigger?.menuOpen) {
            this.themeMenuTrigger.closeMenu();
            return;
        }

        const current = this.themeService.themeSig();
        if (current === 'system') {
            // Automatic/System mode: show a Monitor icon. Clicking opens a small dropdown.
            this.themeMenuTrigger?.openMenu();
        } else if (current === 'light') {
            // Light mode: show a Moon icon. Clicking switches to Dark.
            this.themeService.setTheme('dark');
        } else {
            // Dark mode: show a Sun icon. Clicking switches to Light.
            this.themeService.setTheme('light');
        }
    }

    onThemeContextMenu(event: MouseEvent): void {
        event.preventDefault();
        this.themeMenuTrigger?.openMenu();
    }

    onThemeKeydown(event: KeyboardEvent): void {
        if (event.key === 'ArrowDown' || event.key === 'ContextMenu') {
            event.preventDefault();
            this.themeMenuTrigger?.openMenu();
        }
    }

    onTouchStart(): void {
        this.longPressTimer = setTimeout(() => {
            this.themeMenuTrigger?.openMenu();
        }, 500);
    }

    onTouchEnd(): void {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    selectTheme(theme: ThemeType): void {
        this.themeService.setTheme(theme);
    }

    ngOnInit() {
        if (this.authService.user()) {
            // Pre-load notifications to populate the unread badge on app load
            this.notificationsService.getNotifications().catch(console.error);
        }
    }

    onLogout(): void {
        const dialogRef = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(
            ConfirmDialog,
            {
                data: {
                    title: 'Sign out?',
                    message: 'Are you sure you want to sign out of your account?',
                    confirmLabel: 'Sign out',
                    cancelLabel: 'Cancel',
                },
            },
        );

        dialogRef.afterClosed().subscribe((confirmed) => {
            if (confirmed) {
                this.authService.logout().then(() => this.router.navigate(['/login']));
            }
        });
    }
}
