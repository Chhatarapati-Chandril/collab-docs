import { Module } from '@nestjs/common';
import { CollabGateway } from './collab.gateway';
import { CollabService } from './collab.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [PrismaModule, ConfigModule, JwtModule],
    providers: [CollabGateway, CollabService],
    exports: [CollabGateway],
})
export class CollabModule {}
