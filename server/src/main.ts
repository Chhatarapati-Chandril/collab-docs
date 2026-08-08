import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLoggerService } from './my-logger/my-logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const logger = new MyLoggerService();

    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
        logger,
    });

    app.use(cookieParser());

    app.setGlobalPrefix('api/v1');

    app.enableShutdownHooks();

    // Enable global validation pipe for DTOs
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strips out unexpected properties not in the DTO
            forbidNonWhitelisted: true, // Throws an error if extra properties are sent
            transform: true, // Automatically transforms payloads to DTO class instances
            stopAtFirstError: true,
        }),
    );

    // Register the Global Exception Filter with your custom logger
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, logger));

    const port = Number(process.env.PORT) || 3000;
    await app.listen(port);

    logger.log(`Application is running on port ${port}`, 'Bootstrap');
}
void bootstrap();
