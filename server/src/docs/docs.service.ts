import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Permission, Document } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDocumentDto } from './dto/create-document.dto';
import type { UpdateDocumentDto } from './dto/update-document.dto';
import type { UpdateCoverDto } from './dto/update-cover.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { GetDocumentsResponseDto } from './dto/get-documents-response.dto';
import { DOC_CONSTANTS } from '../common/constants/doc.constants';
import { PERMISSION_LEVELS, PERMISSION_MESSAGES } from '../common/constants/permission.constants';
import { CollabGateway } from '../collab/collab.gateway';
import { CloudinaryService, CloudinaryUploadResult } from '../cloudinary/cloudinary.service';
import 'multer';

@Injectable()
export class DocsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly collabGateway: CollabGateway,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    async createDocument(userId: string, dto: CreateDocumentDto): Promise<DocumentResponseDto> {
        const title = dto.title?.trim() || DOC_CONSTANTS.DEFAULT_TITLE;

        return this.prisma.document.create({
            data: {
                title,
                ownerId: userId,
                coverImageUrl: dto.coverImageUrl || null,
                coverPublicId: dto.coverPublicId || null,
                coverType: dto.coverType || null,
            },
        });
    }

    async getDocuments(userId: string): Promise<GetDocumentsResponseDto> {
        const [myDocuments, sharedPermissions] = await Promise.all([
            this.prisma.document.findMany({
                where: { ownerId: userId },
                include: {
                    _count: { select: { permissions: true } },
                },
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.docPermission.findMany({
                where: { userId },
                include: {
                    document: {
                        include: {
                            owner: { select: { id: true, displayName: true } },
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            }),
        ]);

        const sharedWithMe = sharedPermissions.map(({ document, permission }) => ({
            ...document,
            permission,
        }));

        return {
            myDocuments: {
                count: myDocuments.length,
                documents: myDocuments,
            },
            sharedWithMe: {
                count: sharedWithMe.length,
                documents: sharedWithMe,
            },
        };
    }

    async getDocumentById(userId: string, docId: string): Promise<DocumentResponseDto> {
        const document = await this.findDocument(docId);
        await this.verifyPermission(userId, document, Permission.VIEWER);

        return document;
    }

    async updateDocument(
        userId: string,
        docId: string,
        dto: UpdateDocumentDto,
    ): Promise<DocumentResponseDto> {
        const document = await this.findDocument(docId);

        await this.verifyPermission(userId, document, Permission.EDITOR);

        const updateData: {
            title?: string;
            coverImageUrl?: string | null;
            coverPublicId?: string | null;
            coverType?: string | null;
        } = {};

        if (dto.title !== undefined) {
            updateData.title = dto.title.trim();
        }
        if (dto.coverImageUrl !== undefined) {
            updateData.coverImageUrl = dto.coverImageUrl;
        }
        if (dto.coverPublicId !== undefined) {
            updateData.coverPublicId = dto.coverPublicId;
        }
        if (dto.coverType !== undefined) {
            updateData.coverType = dto.coverType;
        }

        return this.prisma.document.update({
            where: { id: docId },
            data: updateData,
        });
    }

    async setCover(
        userId: string,
        docId: string,
        dto: UpdateCoverDto,
    ): Promise<DocumentResponseDto> {
        const document = await this.findDocument(docId);
        await this.verifyPermission(userId, document, Permission.EDITOR);

        // If old cover was a custom Cloudinary asset and is being replaced, clean it up safely
        if (
            document.coverPublicId &&
            dto.coverPublicId &&
            document.coverPublicId !== dto.coverPublicId
        ) {
            await this.cloudinaryService.deleteCover(document.coverPublicId);
        }

        return this.prisma.document.update({
            where: { id: docId },
            data: {
                coverImageUrl: dto.coverImageUrl,
                coverPublicId: dto.coverPublicId || null,
                coverType: dto.coverType || (dto.coverPublicId ? 'CUSTOM' : 'TEMPLATE'),
            },
        });
    }

    async removeCover(userId: string, docId: string): Promise<DocumentResponseDto> {
        const document = await this.findDocument(docId);
        await this.verifyPermission(userId, document, Permission.EDITOR);

        // If custom asset was stored on Cloudinary, clean it up safely
        if (document.coverPublicId) {
            await this.cloudinaryService.deleteCover(document.coverPublicId);
        }

        return this.prisma.document.update({
            where: { id: docId },
            data: {
                coverImageUrl: null,
                coverPublicId: null,
                coverType: null,
            },
        });
    }

    async uploadCoverImage(
        userId: string,
        file: Express.Multer.File,
    ): Promise<CloudinaryUploadResult> {
        return this.cloudinaryService.uploadCover(file);
    }

    async deleteDocument(userId: string, docId: string): Promise<void> {
        const document = await this.findDocument(docId);
        await this.verifyPermission(userId, document, Permission.OWNER);

        await this.collabGateway.handleDocumentDeleted(docId);

        if (document.coverPublicId) {
            await this.cloudinaryService.deleteCover(document.coverPublicId);
        }

        await this.prisma.document.delete({
            where: { id: docId },
        });
    }

    async copyDocument(userId: string, docId: string): Promise<DocumentResponseDto> {
        const document = await this.findDocument(docId);
        await this.verifyPermission(userId, document, Permission.VIEWER);

        return this.prisma.document.create({
            data: {
                title: `${document.title} - ${DOC_CONSTANTS.COPY_SUFFIX}`,
                ownerId: userId,
                isAnonymous: false,
                coverImageUrl: document.coverImageUrl,
                coverPublicId: document.coverPublicId,
                coverType: document.coverType,
                yjsSnapshot: document.yjsSnapshot,
                snapshotUpdatedAt: new Date(),
            },
        });
    }

    private async findDocument(docId: string): Promise<Document> {
        const document = await this.prisma.document.findUnique({
            where: { id: docId },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        return document;
    }

    private async verifyPermission(
        userId: string,
        document: { id: string; ownerId: string },
        requiredPermission: Permission,
    ): Promise<void> {
        if (document.ownerId === userId) {
            return;
        }

        if (requiredPermission === Permission.OWNER) {
            throw new ForbiddenException(PERMISSION_MESSAGES[requiredPermission]);
        }

        const permission = await this.prisma.docPermission.findFirst({
            where: {
                docId: document.id,
                userId,
            },
            select: {
                permission: true,
            },
        });

        if (
            !permission ||
            PERMISSION_LEVELS[permission.permission] < PERMISSION_LEVELS[requiredPermission]
        ) {
            throw new ForbiddenException(PERMISSION_MESSAGES[requiredPermission]);
        }
    }
}
