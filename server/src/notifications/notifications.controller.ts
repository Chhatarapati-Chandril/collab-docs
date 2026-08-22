import { Controller, Get, Patch, Param, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { Notification } from '@prisma/client';
import type { RequestWithUser } from '../common/types/request-with-user.type';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    async getNotifications(@Req() req: RequestWithUser): Promise<ApiResponse<Notification[]>> {
        const notifications = await this.notificationsService.getUserNotifications(req.user.userId);

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Notifications fetched successfully',
            data: notifications,
        });
    }

    @Patch(':id/read')
    async markAsRead(
        @Req() req: RequestWithUser,
        @Param('id') id: string,
    ): Promise<ApiResponse<Notification>> {
        const notification = await this.notificationsService.markAsRead(req.user.userId, id);

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Notification marked as read',
            data: notification,
        });
    }
}
