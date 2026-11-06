import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MyLoggerModule } from '../my-logger/my-logger.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
    imports: [ConfigModule, PrismaModule, MyLoggerModule],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule {}
