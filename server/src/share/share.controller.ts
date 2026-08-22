import {
    Controller,
    Post,
    Body,
    Req,
    UseGuards,
    HttpStatus,
    Delete,
    Param,
    HttpCode,
    Patch,
} from '@nestjs/common';
import { ShareService } from './share.service';
import { ShareEmailDto } from './dto/share-email.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import { RequestAccessDto } from './dto/request-access.dto';
import { DocPermission, Notification } from '@prisma/client';
import type { RequestWithUser } from '../common/types/request-with-user.type';
import { ResolveAccessRequestDto } from './dto/resolve-access-request.dto';
import { SHARE_CONSTANTS } from '../common/constants/share.constants';
import { SetPublicAccessDto } from './dto/set-public-access.dto';

@UseGuards(JwtAuthGuard)
@Controller('share')
export class ShareController {
    constructor(private readonly shareService: ShareService) {}

    @Post('email')
    @HttpCode(HttpStatus.OK)
    async shareViaEmail(
        @Req() req: RequestWithUser,
        @Body() dto: ShareEmailDto,
    ): Promise<ApiResponse<DocPermission>> {
        const permission = await this.shareService.shareViaEmail(req.user.userId, dto);

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: `Successfully granted ${dto.permission} access to ${dto.email}`,
            data: permission,
        });
    }

    @Post('request-access')
    @HttpCode(HttpStatus.CREATED)
    async requestAccess(
        @Req() req: RequestWithUser,
        @Body() dto: RequestAccessDto,
    ): Promise<ApiResponse<Notification>> {
        const notification = await this.shareService.requestAccess(req.user.userId, dto);

        return new ApiResponse({
            statusCode: HttpStatus.CREATED,
            message: 'Access request sent to the document owner',
            data: notification,
        });
    }

    @Delete(':docId/users/:userId')
    @HttpCode(HttpStatus.OK)
    async removePermission(
        @Req() req: RequestWithUser,
        @Param('docId') docId: string,
        @Param('userId') targetUserId: string,
    ): Promise<ApiResponse<null>> {
        await this.shareService.removePermission(req.user.userId, docId, targetUserId);

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'User access revoked successfully',
            data: null,
        });
    }

    @Patch('resolve-request/:notificationId')
    @HttpCode(HttpStatus.OK)
    async resolveRequest(
        @Req() req: RequestWithUser,
        @Param('notificationId') notificationId: string,
        @Body() dto: ResolveAccessRequestDto,
    ): Promise<ApiResponse<Notification>> {
        const notification = await this.shareService.resolveAccessRequest(
            req.user.userId,
            notificationId,
            dto,
        );

        const actionMessage =
            dto.action === SHARE_CONSTANTS.ACCESS_REQUEST_ACTIONS.APPROVE
                ? SHARE_CONSTANTS.ACTION_MESSAGE.APPROVE
                : SHARE_CONSTANTS.ACTION_MESSAGE.DENY;

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: `Access request ${actionMessage.toLowerCase()} successfully`,
            data: notification,
        });
    }

    @Patch(':docId/public-access')
    @HttpCode(HttpStatus.OK)
    async updatePublicAccess(
        @Req() req: RequestWithUser,
        @Param('docId') docId: string,
        @Body() dto: SetPublicAccessDto,
    ) {
        const updatedDoc = await this.shareService.updatePublicAccess(
            req.user.userId,
            docId,
            dto.publicAccess || null, // Fallback to null if not provided
        );

        const accessText = dto.publicAccess
            ? `Anyone with the link can now ${dto.publicAccess.toLowerCase()}`
            : 'Document is now restricted';

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: accessText,
            data: updatedDoc,
        });
    }
}
