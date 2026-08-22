import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_CONSTANTS } from '../common/constants/notifications.constants';

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    // Shows ALL unread notifications, but only read notifications from the last n days
    async getUserNotifications(userId: string) {
        const notificationCutoffDate = new Date();
        notificationCutoffDate.setDate(
            notificationCutoffDate.getDate() - NOTIFICATION_CONSTANTS.NOTIFICATION_RETENTION_DAYS,
        );

        return this.prisma.notification.findMany({
            where: {
                toUserId: userId,
                OR: [
                    { isRead: false }, // Show all unread no matter how old
                    { isRead: true, createdAt: { gte: notificationCutoffDate } }, // Only show read from the last n days
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(userId: string, notificationId: string) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        if (notification.toUserId !== userId) {
            throw new ForbiddenException('You cannot modify this notification');
        }

        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
}
