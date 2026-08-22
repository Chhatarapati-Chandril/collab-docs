import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Namespace, Socket } from 'socket.io';
import * as Y from 'yjs';
import { Permission } from '@prisma/client';

import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CollabService } from './collab.service';
import { CollabSocketData } from './types/collab-socket-data.type';
import { COLLAB_CONSTANTS } from '../common/constants/collab.constants';

type CollabSocket = Socket<any, any, any, CollabSocketData>;

@WebSocketGateway({
    namespace: '/docs',
})
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Namespace;

    private readonly logger = new Logger(CollabGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly collabService: CollabService,
        private readonly configService: ConfigService,
    ) {}

    public async handleConnection(client: CollabSocket): Promise<void> {
        try {
            const authHeader = client.handshake.headers.authorization;
            const token = (client.handshake.auth?.token ||
                (authHeader && authHeader.split(' ')[1])) as string | undefined;

            const docId = (client.handshake.auth?.docId || client.handshake.query?.docId) as
                string | undefined;

            if (!docId) {
                throw new UnauthorizedException('Document ID is required');
            }

            if (!token) {
                throw new UnauthorizedException('Authentication token is required');
            }

            let userId: string;
            try {
                const payload = this.jwtService.verify<JwtPayload>(token, {
                    secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
                });
                userId = payload.sub;
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`JWT verification failed: ${errorMessage}`);
                throw new UnauthorizedException('Invalid or expired token');
            }

            // Verify permissions via your CollabService logic
            const { role, isAnonymous } = await this.collabService.authorizeUserForDocument(
                userId,
                docId,
            );

            // Bind strongly-typed session metadata to the socket
            client.data = {
                userId,
                docId,
                userRole: role,
                isAnonymousDoc: isAnonymous,
                accessRevoked: false,
            };

            // Join the specific room matching the document ID
            await client.join(docId);

            // Fetch active Yjs structural snapshot and stream down to client
            const ydoc = await this.collabService.getOrCreateDoc(docId);
            const initialState = Y.encodeStateAsUpdate(ydoc);

            client.emit('sync', Buffer.from(initialState));

            this.logger.log(`User ${userId} successfully joined document ${docId} as ${role}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Connection refused for client ${client.id}: ${message}`);

            // Send explicit error payload down before dropping connection
            client.emit('error', { message });
            client.disconnect(true);
        }
    }

    public handleDisconnect(client: CollabSocket): void {
        this.logger.log(`Client disconnected: ${client.id}`);

        const { docId, userId } = client.data ?? {};

        if (!docId || !userId) {
            return;
        }

        // Notify other document peers
        client.to(docId).emit('user-left', { userId });

        // Grace period handler to free up memory if the room becomes empty
        setTimeout(() => {
            const room = this.server.adapter.rooms.get(docId);

            if (!room || room.size === 0) {
                this.collabService.cleanupDoc(docId).catch((err: unknown) => {
                    const message = err instanceof Error ? err.stack : String(err);
                    this.logger.error(`Failed to cleanup document ${docId}: ${message}`);
                });
            }
        }, COLLAB_CONSTANTS.DISCONNECT_GRACE_PERIOD_MS);
    }

    // Instantly cuts off targeted user's socket connection upon permission revocation.
    public async revokeDocumentAccess(userId: string, docId: string): Promise<void> {
        const sockets = (await this.server.in(docId).fetchSockets()) as unknown as CollabSocket[];

        for (const socket of sockets) {
            if (socket.data?.userId === userId) {
                socket.data.accessRevoked = true;

                // Push access-revoked notification frame to client UI
                socket.emit('access-revoked', {
                    docId,
                    message: 'Your access to this document has been revoked by the owner.',
                });

                // Instantly sever connection from server side
                socket.disconnect(true);
                this.logger.log(`Forcefully disconnected user ${userId} from document ${docId}`);
            }
        }
    }

    // Broadcasts a deletion event and disconnects all users in a document room.
    public async handleDocumentDeleted(docId: string): Promise<void> {
        this.server.in(docId).emit('document-deleted', {
            message: 'This document has been deleted by the owner.',
        });

        const sockets = (await this.server.in(docId).fetchSockets()) as unknown as CollabSocket[];

        for (const socket of sockets) {
            this.logger.log(`Disconnecting socket ${socket.id}, user ${socket.data?.userId}`);

            socket.emit('document-deleted', {
                message: 'This document has been deleted by the owner.',
            });

            socket.disconnect(true);
        }

        await this.collabService.cleanupDoc(docId);

        this.logger.log(`Document ${docId} deleted: All users disconnected and memory cleared.`);
    }

    @SubscribeMessage('update')
    public async handleUpdate(
        @ConnectedSocket() client: CollabSocket,
        @MessageBody() updateBuffer: Buffer,
    ): Promise<void> {
        const { docId, userRole, accessRevoked } = client.data ?? {};

        if (!docId || !userRole) {
            client.emit('error', { message: 'Socket state is uninitialized' });
            return;
        }

        if (accessRevoked) {
            client.emit('error', { message: 'Access has been revoked' });
            return;
        }

        if (userRole === Permission.VIEWER) {
            client.emit('error', { message: 'Viewers cannot edit this document' });
            return;
        }

        if (!Buffer.isBuffer(updateBuffer)) {
            client.emit('error', { message: 'Invalid payload structure' });
            return;
        }

        try {
            const updateArray = new Uint8Array(updateBuffer);
            await this.collabService.applyUpdate(docId, updateArray);

            // Broadcast binary changes to all active room peers except sender
            client.to(docId).emit('update', updateBuffer);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed handling update for doc ${docId}: ${message}`);
            client.emit('error', { message: 'Failed to process document update' });
        }
    }
}
