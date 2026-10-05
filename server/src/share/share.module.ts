import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { MyLoggerModule } from '../my-logger/my-logger.module';
import { CollabModule } from '../collab/collab.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [MyLoggerModule, CollabModule, NotificationsModule],
    controllers: [ShareController],
    providers: [ShareService],
    exports: [ShareService],
})
export class ShareModule {}
