import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShareEmailDto } from './dto/share-email.dto';
import { NotificationType, Notification, Permission } from '@prisma/client';
import { RequestAccessDto } from './dto/request-access.dto';
import { MyLoggerService } from '../my-logger/my-logger.service';
import { ResolveAccessRequestDto } from './dto/resolve-access-request.dto';
import { SHARE_CONSTANTS } from '../common/constants/share.constants';
import { CollabGateway } from '../collab/collab.gateway';

@Injectable()
export class ShareService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: MyLoggerService,
        private readonly collabGateway: CollabGateway,
    ) {}

    async shareViaEmail(requesterId: string, dto: ShareEmailDto) {
        const { docId, email, permission } = dto;

        // 1. Verify the document exists and the requester is the OWNER
        const document = await this.prisma.document.findUnique({
            where: { id: docId },
            select: { ownerId: true },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.ownerId !== requesterId) {
            throw new ForbiddenException('Only the document owner can share this document');
        }

        // 2. Find the target user by their email
        const targetUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (!targetUser) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        // 3. Prevent the owner from sharing the document with themselves
        if (targetUser.id === requesterId) {
            throw new BadRequestException('You cannot share a document with yourself');
        }

        // 4. Upsert the permission (Create if new, Update if changing permission level)
        const docPermission = await this.prisma.docPermission.upsert({
            where: {
                docId_userId: { docId, userId: targetUser.id },
            },
            update: {
                permission,
            },
            create: {
                docId,
                userId: targetUser.id,
                permission,
            },
        });

        // 5. Create a notification for the target user so it shows up in their UI
        await this.prisma.notification.create({
            data: {
                type: NotificationType.PERMISSION_CHANGED,
                docId,
                fromUserId: requesterId,
                toUserId: targetUser.id,
                meta: { grantedPermission: permission },
            },
        });

        return docPermission;
    }

    async requestAccess(requesterId: string, dto: RequestAccessDto) {
        const { docId, permission } = dto;

        const document = await this.prisma.document.findUnique({
            where: { id: docId },
            select: { ownerId: true },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.ownerId === requesterId) {
            throw new BadRequestException('You are already the owner of this document');
        }

        // Prevent spam: Check if a pending unread request already exists from this user
        const existingRequest = await this.prisma.notification.findFirst({
            where: {
                type: NotificationType.ACCESS_REQUEST,
                docId,
                fromUserId: requesterId,
                isRead: false,
            },
        });

        if (existingRequest) {
            throw new ConflictException(
                'You already have a pending access request for this document',
            );
        }

        // Create the notification for the document owner
        const notification = await this.prisma.notification.create({
            data: {
                type: NotificationType.ACCESS_REQUEST,
                docId,
                fromUserId: requesterId,
                toUserId: document.ownerId,
                meta: { requestedPermission: permission },
            },
        });

        return notification;
    }

    async removePermission(requesterId: string, docId: string, targetUserId: string) {
        const document = await this.prisma.document.findUnique({
            where: { id: docId },
            select: { ownerId: true },
        });

        if (!document) throw new NotFoundException('Document not found');

        if (document.ownerId !== requesterId) {
            throw new ForbiddenException('Only the owner can remove permissions');
        }

        if (targetUserId === requesterId) {
            throw new BadRequestException('You cannot remove your own ownership');
        }

        try {
            await this.prisma.docPermission.delete({
                where: {
                    docId_userId: { docId, userId: targetUserId },
                },
            });

            await this.collabGateway.revokeDocumentAccess(targetUserId, docId);

            // Notify the user that their access was revoked
            await this.prisma.notification.create({
                data: {
                    type: NotificationType.PERMISSION_CHANGED,
                    docId,
                    fromUserId: requesterId,
                    toUserId: targetUserId,
                    meta: { grantedPermission: 'REMOVED' },
                },
            });
        } catch (error) {
            // Prisma throws if the record to delete doesn't exist
            this.logger.error(
                `Failed to remove permission for user ${targetUserId} on document ${docId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw new NotFoundException('Permission record not found for this user');
        }
    }

    async resolveAccessRequest(
        ownerId: string,
        notificationId: string,
        dto: ResolveAccessRequestDto,
    ): Promise<Notification> {
        // 1. Fetch the notification to ensure it exists and the logged-in user is the recipient
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (
            !notification ||
            notification.toUserId !== ownerId ||
            notification.type !== NotificationType.ACCESS_REQUEST
        ) {
            throw new ForbiddenException('Invalid or unauthorized access request');
        }

        // 2. If approved, apply the permission (using the owner's dropdown selection)
        if (dto.action === SHARE_CONSTANTS.ACCESS_REQUEST_ACTIONS.APPROVE) {
            await this.prisma.docPermission.upsert({
                where: {
                    docId_userId: { docId: notification.docId, userId: notification.fromUserId },
                },
                update: { permission: dto.grantedPermission },
                create: {
                    docId: notification.docId,
                    userId: notification.fromUserId,
                    permission: dto.grantedPermission,
                },
            });

            // Notify the requester that they were granted access
            await this.prisma.notification.create({
                data: {
                    type: NotificationType.PERMISSION_CHANGED,
                    docId: notification.docId,
                    fromUserId: ownerId,
                    toUserId: notification.fromUserId,
                    meta: { grantedPermission: dto.grantedPermission },
                },
            });
        }

        // 3. Mark the original request as read so the NotificationsService stops returning it as unread
        return this.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }

    async updatePublicAccess(ownerId: string, docId: string, access: Permission | null) {
        // 1. Verify owner
        const doc = await this.prisma.document.findUnique({ where: { id: docId } });
        if (!doc || doc.ownerId !== ownerId) {
            throw new ForbiddenException('Only the owner can change public access settings');
        }

        // 2. Update the setting
        return this.prisma.document.update({
            where: { id: docId },
            data: { publicAccess: access },
            select: { id: true, title: true, publicAccess: true },
        });
    }
}
