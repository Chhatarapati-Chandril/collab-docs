import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { MyLoggerService } from '../../my-logger/my-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly logger: MyLoggerService,
    ) {
        this.logger.setContext(AllExceptionsFilter.name);
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : {
                      message:
                          exception instanceof Error ? exception.message : 'Internal server error',
                  };

        // Explicitly cast the path to a string to satisfy strict lint rules
        const path = String(httpAdapter.getRequestUrl(request));

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path,
            error:
                typeof exceptionResponse === 'object' && exceptionResponse !== null
                    ? exceptionResponse
                    : { message: exceptionResponse },
        };

        const stack = exception instanceof Error ? exception.stack : undefined;

        this.logger.error(`HTTP Status: ${httpStatus} - Path: ${path}`, stack);

        httpAdapter.reply(response, responseBody, httpStatus);
    }
}
