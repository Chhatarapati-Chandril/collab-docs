import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Namespace, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';
import { Notification } from '@prisma/client';

type UserSocket = Socket & { data: { userId: string } };

@WebSocketGateway({
    namespace: '/user',
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:4200',
        credentials: true,
    },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Namespace;

    private readonly logger = new Logger(NotificationsGateway.name);

    constructor(private readonly tokenService: TokenService) {}

    public async handleConnection(client: UserSocket): Promise<void> {
        try {
            const authHeader = client.handshake.headers.authorization;
            const token = (client.handshake.auth?.token ||
                (authHeader && authHeader.split(' ')[1])) as string | undefined;

            if (!token) {
                throw new UnauthorizedException('Authentication token is required');
            }

            const payload = this.tokenService.verifyAccessToken(token);
            const userId = payload.sub;

            client.data = { userId };
            await client.join(userId);

            this.logger.log(`User ${userId} joined user notifications room`);
        } catch (error: unknown) {
            this.logger.error(
                `Failed to authenticate notification socket: ${error instanceof Error ? error.message : String(error)}`,
            );
            client.disconnect(true);
        }
    }

    public handleDisconnect(_client: UserSocket): void {}

    public sendNotification(userId: string, notification: Notification) {
        this.server.to(userId).emit('notification', notification);
    }
}
