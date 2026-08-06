import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLoggerService } from './my-logger/my-logger.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
        logger: new MyLoggerService(),
    });

    app.enableShutdownHooks();

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
}
void bootstrap();
