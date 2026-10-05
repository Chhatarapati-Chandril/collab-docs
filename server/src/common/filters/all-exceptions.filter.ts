import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

import { MyLoggerService } from '../../my-logger/my-logger.service';

import { createExceptionResponse } from './exception-response';

import { getExceptionStack } from './exception-utils';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly isProduction = process.env.NODE_ENV === 'production';

    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly logger: MyLoggerService,
    ) {
        this.logger.setContext(AllExceptionsFilter.name);
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;

        const context = host.switchToHttp();

        const request = context.getRequest<Request>();

        const response = context.getResponse<Response>();

        const path = String(httpAdapter.getRequestUrl(request));

        const exceptionResponse = createExceptionResponse(exception, this.isProduction);

        const stack = getExceptionStack(exception);

        this.logger.error(`HTTP ${exceptionResponse.statusCode} ${request.method} ${path}`, stack);

        const responseBody = this.isProduction
            ? this.createProductionResponse(exceptionResponse)
            : this.createDevelopmentResponse(exceptionResponse, path);

        httpAdapter.reply(response, responseBody, exceptionResponse.statusCode);
    }

    private createProductionResponse(
        exceptionResponse: ReturnType<typeof createExceptionResponse>,
    ) {
        return {
            statusCode: exceptionResponse.statusCode,
            message: exceptionResponse.message,
        };
    }

    private createDevelopmentResponse(
        exceptionResponse: ReturnType<typeof createExceptionResponse>,
        path: string,
    ) {
        return {
            statusCode: exceptionResponse.statusCode,
            message: exceptionResponse.message,
            ...(exceptionResponse.error
                ? {
                      error: exceptionResponse.error,
                  }
                : {}),
            timestamp: new Date().toISOString(),
            path,
        };
    }
}
