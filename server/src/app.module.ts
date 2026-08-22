import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DocsModule } from './docs/docs.module';
import { CollabModule } from './collab/collab.module';
import { ShareModule } from './share/share.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { MyLoggerModule } from './my-logger/my-logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { HashService } from './common/hash/hash.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_TTL } from './common/constants/app.constants';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            expandVariables: true,
        }),
        ThrottlerModule.forRoot([
            {
                ttl: RATE_LIMIT_TTL,
                limit: RATE_LIMIT_MAX_REQUESTS,
            },
        ]),
        MyLoggerModule,
        PrismaModule,
        AuthModule,
        UsersModule,
        DocsModule,
        CollabModule,
        ShareModule,
        NotificationsModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
    providers: [
        AppService,
        HashService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
