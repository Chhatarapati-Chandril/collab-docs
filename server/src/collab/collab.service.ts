import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as Y from 'yjs';
import { COLLAB_CONSTANTS } from '../common/constants/collab.constants';
import { Permission } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollabService {
    private readonly logger = new Logger(CollabService.name);

    private readonly activeDocs = new Map<string, Y.Doc>();
    private readonly loadingDocs = new Map<string, Promise<Y.Doc>>();
    private readonly saveTimers = new Map<string, NodeJS.Timeout>();
    private readonly savingDocs = new Set<string>();

    constructor(private readonly prisma: PrismaService) {}

    async getOrCreateDoc(docId: string): Promise<Y.Doc> {
        // 1. Check if it is already fully loaded
        if (this.activeDocs.has(docId)) {
            return this.activeDocs.get(docId)!;
        }

        // 2. Check if it is currently in the process of loading (prevents race condition)
        let initPromise = this.loadingDocs.get(docId);

        // 3. If not loading, initiate the entire loading + caching process
        if (!initPromise) {
            initPromise = this.initializeDoc(docId)
                .then((ydoc) => {
                    this.activeDocs.set(docId, ydoc);
                    this.startPeriodicSave(docId);
                    return ydoc;
                })
                .finally(() => {
                    // Clean up the loading cache once initialization succeeds or fails
                    this.loadingDocs.delete(docId);
                });

            this.loadingDocs.set(docId, initPromise);
        }

        return initPromise;
    }

    private async initializeDoc(docId: string): Promise<Y.Doc> {
        const ydoc = new Y.Doc();

        // Fetch the latest snapshot from PostgreSQL
        const document = await this.prisma.document.findUnique({
            where: { id: docId },
            select: { yjsSnapshot: true },
        });

        // If a snapshot exists, apply it to the new Yjs document
        if (document?.yjsSnapshot) {
            Y.applyUpdate(ydoc, new Uint8Array(document.yjsSnapshot));
        }

        return ydoc;
    }

    async applyUpdate(docId: string, update: Uint8Array): Promise<void> {
        const ydoc = await this.getOrCreateDoc(docId);
        Y.applyUpdate(ydoc, update);
    }

    async saveSnapshot(docId: string): Promise<void> {
        // Prevent overlapping save operations for the same document
        if (this.savingDocs.has(docId)) return;

        const ydoc = this.activeDocs.get(docId);
        if (!ydoc) return;

        this.savingDocs.add(docId);

        try {
            const snapshot = Y.encodeStateAsUpdate(ydoc);

            await this.prisma.document.update({
                where: { id: docId },
                data: {
                    yjsSnapshot: Buffer.from(snapshot),
                    snapshotUpdatedAt: new Date(),
                },
            });

            this.logger.log(`Snapshot saved to DB for document: ${docId}`);
        } finally {
            this.savingDocs.delete(docId);
        }
    }

    private startPeriodicSave(docId: string) {
        if (this.saveTimers.has(docId)) return;

        // Save to PostgreSQL every n second
        const timer = setInterval(() => {
            this.saveSnapshot(docId).catch((err: unknown) => {
                const errorMessage = err instanceof Error ? err.stack : String(err);
                this.logger.error(`Failed to save snapshot for ${docId}`, errorMessage);
            });
        }, COLLAB_CONSTANTS.SAVE_INTERVAL_MS);

        this.saveTimers.set(docId, timer);
    }

    async cleanupDoc(docId: string): Promise<void> {
        const ydoc = this.activeDocs.get(docId);

        // Perform final save before wiping memory
        await this.saveSnapshot(docId);

        // Clear intervals
        const timer = this.saveTimers.get(docId);
        if (timer) clearInterval(timer);
        this.saveTimers.delete(docId);

        // Explicitly destroy the Y.Doc instance to free memory completely
        if (ydoc) {
            ydoc.destroy();
        }

        this.activeDocs.delete(docId);
        this.logger.log(`Cleaned up memory for document: ${docId}`);
    }

    async authorizeUserForDocument(
        userId: string,
        docId: string,
    ): Promise<{ role: Permission; isAnonymous: boolean }> {
        const doc = await this.prisma.document.findUnique({
            where: { id: docId },
            include: {
                permissions: { where: { userId } },
            },
        });

        if (!doc) {
            throw new NotFoundException('Document not found');
        }

        let role: Permission | null = null;

        if (doc.ownerId === userId) {
            role = Permission.OWNER;
        } else if (doc.permissions.length > 0) {
            role = doc.permissions[0].permission;
        } else if (doc.publicAccess) {
            role = doc.publicAccess;
        }

        if (!role) {
            throw new UnauthorizedException('You do not have permission to access this document');
        }

        return {
            role,
            isAnonymous: doc.isAnonymous,
        };
    }
}
