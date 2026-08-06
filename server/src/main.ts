import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLoggerService } from './my-logger/my-logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
    const logger = new MyLoggerService();

    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
        logger,
    });

    app.enableShutdownHooks();

    // Register the Global Exception Filter with your custom logger
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, logger));

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`Application is running on port ${port}`, 'Bootstrap');
}
void bootstrap();
