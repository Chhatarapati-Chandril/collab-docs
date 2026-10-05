import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, NgZone } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { AppNotification } from '../models/notification.model';
import { environment } from '../../../environments/environment';
import { Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class Notifications {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/notifications`;

    readonly unreadCount = signal<number>(0);
    readonly newNotification$ = new Subject<AppNotification>();

    async getNotifications(): Promise<AppNotification[]> {
        const res = await firstValueFrom(
            this.http.get<ApiResponse<AppNotification[]>>(this.baseUrl),
        );
        const notifications = res.data;
        this.updateUnreadCount(notifications);
        return notifications;
    }

    async markAsRead(id: string): Promise<AppNotification> {
        const res = await firstValueFrom(
            this.http.patch<ApiResponse<AppNotification>>(`${this.baseUrl}/${id}/read`, {}),
        );
        this.decrementUnreadCount();
        return res.data;
    }

    updateUnreadCount(notifications: AppNotification[]) {
        const count = notifications.filter((n) => !n.isRead).length;
        this.unreadCount.set(count);
    }

    decrementUnreadCount() {
        this.unreadCount.update((c) => Math.max(0, c - 1));
    }

    // --- Real-time & Browser Notifications ---

    private socket: Socket | null = null;
    private zone = inject(NgZone);

    async requestNotificationPermission(): Promise<void> {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    private showBrowserNotification(notif: AppNotification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        let body = 'You have a new notification';
        if (notif.type === 'ACCESS_REQUEST') {
            body = `${notif.fromUser?.displayName} is requesting access to ${notif.document?.title}`;
        } else if (notif.type === 'PERMISSION_CHANGED') {
            body = `${notif.fromUser?.displayName} updated your access on ${notif.document?.title}`;
        }

        const n = new Notification('CollabDocs', {
            body,
            icon: '/assets/icons/icon-128x128.png',
            silent: false,
        });

        n.onclick = () => {
            window.focus();
            n.close();
        };
    }

    connectSocket(token: string) {
        if (this.socket) return;
        import('socket.io-client').then(({ io }) => {
            this.socket = io(`${environment.socketUrl}/user`, {
                auth: { token },
            });

            this.socket.on('notification', (notif: AppNotification) => {
                this.zone.run(() => {
                    this.unreadCount.update((c) => c + 1);
                    this.showBrowserNotification(notif);
                    this.newNotification$.next(notif);
                });
            });
        });
    }

    disconnectSocket() {
        this.socket?.disconnect();
        this.socket = null;
    }
}
