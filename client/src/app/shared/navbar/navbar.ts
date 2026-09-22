import { Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { Auth } from '../../core/services/auth';
import { Notifications } from '../../core/services/notifications';
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
        MatDividerModule,
    ],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
    private authService = inject(Auth);
    private notificationsService = inject(Notifications);
    private router = inject(Router);
    private dialog = inject(MatDialog);

    readonly user = this.authService.user;
    readonly userDisplayName = computed(() => this.user()?.displayName ?? '');
    readonly unreadCount = this.notificationsService.unreadCount;

    readonly getColorForUser = getColorForUser;
    readonly getInitial = getInitial;

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
