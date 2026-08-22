import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DatabaseSweeperService {
    private readonly logger = new Logger(DatabaseSweeperService.name);

    constructor(private readonly prisma: PrismaService) {}

    // Runs every day at 3:00 AM
    @Cron('0 3 * * *')
    async performNightlyCleanup() {
        this.logger.log('Starting nightly database cleanup...');

        // 1. Delete expired refresh tokens
        const deletedTokens = await this.prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });

        // 2. Delete READ notifications older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const deletedNotifications = await this.prisma.notification.deleteMany({
            where: {
                isRead: true,
                createdAt: { lt: sevenDaysAgo },
            },
        });

        this.logger.log(
            `Cleanup complete: Removed ${deletedTokens.count} tokens and ${deletedNotifications.count} notifications.`,
        );
    }
}
