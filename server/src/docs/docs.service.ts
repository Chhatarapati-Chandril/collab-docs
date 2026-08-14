import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Permission, Document } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDocumentDto } from './dto/create-document.dto';
import type { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { GetDocumentsResponseDto } from './dto/get-documents-response.dto';
import { DOC_CONSTANTS } from '../common/constants/doc.constants';
import { PERMISSION_LEVELS, PERMISSION_MESSAGES } from '../common/constants/permission.constants';

@Injectable()
export class DocsService {
    constructor(private readonly prisma: PrismaService) {}

    async createDocument(userId: string, dto: CreateDocumentDto): Promise<DocumentResponseDto> {
        const title = dto.title?.trim() || DOC_CONSTANTS.DEFAULT_TITLE;

        return this.prisma.document.create({
            data: {
                title,
                ownerId: userId,
            },
        });
    }

    async getDocuments(userId: string): Promise<GetDocumentsResponseDto> {
        const [myDocuments, sharedPermissions] = await Promise.all([
            this.prisma.document.findMany({
                where: { ownerId: userId },
                orderBy: { updatedAt: 'desc' },
            }),
            this.prisma.docPermission.findMany({
                where: { userId },
                include: { document: true },
                orderBy: { updatedAt: 'desc' },
            }),
        ]);

        const sharedWithMe = sharedPermissions.map(({ document }) => document);

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

    async updateDocument(
        userId: string,
        docId: string,
        dto: UpdateDocumentDto,
    ): Promise<DocumentResponseDto> {
        const document = await this.findDocument(docId);

        await this.verifyPermission(userId, document, Permission.EDITOR);

        const newTitle = dto.title.trim();

        if (document.title === newTitle) {
            return document;
        }

        return this.prisma.document.update({
            where: { id: docId },
            data: { title: newTitle },
        });
    }

    async deleteDocument(userId: string, docId: string): Promise<void> {
        const document = await this.findDocument(docId);

        await this.verifyPermission(userId, document, Permission.OWNER);

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
