import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { AppNotification } from '../models/notification.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Notifications {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/notifications`;

    readonly unreadCount = signal<number>(0);

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
        // We will let the component handle re-fetching or manually decrementing the count,
        // or we could manage state here. For simplicity, we just expose unreadCount to update it.
        return res.data;
    }

    updateUnreadCount(notifications: AppNotification[]) {
        const count = notifications.filter((n) => !n.isRead).length;
        this.unreadCount.set(count);
    }

    decrementUnreadCount() {
        this.unreadCount.update((c) => Math.max(0, c - 1));
    }
}
