import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocsModule } from './docs/docs.module';
import { CollabModule } from './collab/collab.module';
import { SharingModule } from './sharing/sharing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { MyLoggerModule } from './my-logger/my-logger.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            expandVariables: true,
        }),
        MyLoggerModule,
        PrismaModule,
        AuthModule,
        UsersModule,
        DocsModule,
        CollabModule,
        SharingModule,
        NotificationsModule,
        StorageModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
