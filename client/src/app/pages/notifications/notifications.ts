import { Component, OnInit, inject, signal } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Notifications as NotificationsService } from '../../core/services/notifications';
import { Share } from '../../core/services/share';
import { Notifier } from '../../shared/services/notifier';
import { AppNotification } from '../../core/models/notification.model';
import { NOTIFICATIONS_CONSTANTS } from './notifications.constants';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { RouterLink } from '@angular/router';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { getColorForUser, getInitial } from '../../shared/utils/avatar.util';

import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [
        MatListModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatFormFieldModule,
        RelativeTimePipe,
        RouterLink,
    ],
    templateUrl: './notifications.html',
    styleUrl: './notifications.scss',
})
export class Notifications implements OnInit {
    private notificationsService = inject(NotificationsService);
    private shareService = inject(Share);
    private notifier = inject(Notifier);

    readonly CONSTANTS = NOTIFICATIONS_CONSTANTS;
    readonly getColorForUser = getColorForUser;
    readonly getInitial = getInitial;

    readonly notifications = signal<AppNotification[]>([]);
    readonly isLoading = signal(true);
    readonly error = signal<string | null>(null);
    readonly unreadCount = this.notificationsService.unreadCount;
    readonly grantedPermissions = signal<Record<string, string>>({});

    ngOnInit(): void {
        this.loadNotifications();
    }

    async loadNotifications(): Promise<void> {
        this.isLoading.set(true);
        this.error.set(null);

        try {
            const data = await this.notificationsService.getNotifications();

            // Map backend resolved state to UI properties
            const mappedData = data.map((n) => {
                if (n.type === 'ACCESS_REQUEST' && n.meta?.resolvedAction) {
                    const actionText =
                        n.meta.resolvedAction === 'APPROVE'
                            ? `Approved as ${n.meta.resolvedPermission || 'VIEWER'}`
                            : 'Denied';
                    return {
                        ...n,
                        _resolved: true,
                        _resolvedText: actionText,
                    };
                }
                return n;
            });

            this.notifications.set(mappedData);
        } catch (err) {
            this.error.set(extractErrorMessage(err, this.CONSTANTS.errorFetching));
        } finally {
            this.isLoading.set(false);
        }
    }

    async markAsRead(notification: AppNotification) {
        if (notification.isRead) return;

        try {
            await this.notificationsService.markAsRead(notification.id);
            this.notifications.update((list) =>
                list.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
            );
        } catch (err) {
            this.notifier.showError(extractErrorMessage(err, this.CONSTANTS.errorAction));
        }
    }

    getGrantedPermission(notification: AppNotification): string {
        return (
            this.grantedPermissions()[notification.id] ||
            (notification.meta?.requestedPermission as string) ||
            'VIEWER'
        );
    }

    setGrantedPermission(notification: AppNotification, permission: string): void {
        this.grantedPermissions.update((map) => ({ ...map, [notification.id]: permission }));
    }

    async resolveRequest(notification: AppNotification, action: 'APPROVE' | 'DENY') {
        if (notification._resolved) return;

        try {
            const grantedPermission = this.getGrantedPermission(notification);
            await this.shareService.resolveAccessRequest(notification.id, {
                action,
                grantedPermission: grantedPermission as 'EDITOR' | 'VIEWER',
            });
            this.notifier.showSuccess(this.CONSTANTS.actionSuccess);

            // Mark as resolved locally so the button changes to a text badge
            this.notifications.update((list) =>
                list.map((n) =>
                    n.id === notification.id
                        ? {
                              ...n,
                              _resolved: true,
                              _resolvedText:
                                  action === 'APPROVE'
                                      ? `Approved as ${grantedPermission}`
                                      : 'Denied',
                          }
                        : n,
                ),
            );

            // Still mark as read so the unread count drops
            if (!notification.isRead) {
                this.markAsRead(notification);
            }
        } catch (err) {
            this.notifier.showError(extractErrorMessage(err, this.CONSTANTS.errorAction));
        }
    }
}
