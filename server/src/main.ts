import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLoggerService } from './my-logger/my-logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SWAGGER_PATH } from './common/constants/app.constants';

async function bootstrap() {
    const logger = new MyLoggerService();

    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
        logger,
    });

    app.use(cookieParser());

    app.setGlobalPrefix('api/v1');

    app.enableShutdownHooks();

    app.enableCors({
        origin: process.env.CLIENT_URL || 'http://localhost:4200',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            stopAtFirstError: true,
            forbidUnknownValues: true,
            validationError: {
                target: false,
                value: false,
            },
        }),
    );

    // Register the Global Exception Filter with your custom logger
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, logger));

    const config = new DocumentBuilder()
        .setTitle('CollabDocs API')
        .setDescription('The REST API documentation for the CollabDocs project')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(SWAGGER_PATH, app, document);

    const port = Number(process.env.PORT);
    await app.listen(port);

    logger.log(`Application is running on port ${port}`, 'Bootstrap');
}
void bootstrap();
