import { HttpException, HttpStatus } from '@nestjs/common';

export interface ExceptionResponseBody {
    statusCode: number;
    message: string | string[];
    error?: string;
}

export function createExceptionResponse(
    exception: unknown,
    isProduction: boolean,
): ExceptionResponseBody {
    if (exception instanceof HttpException) {
        return createHttpExceptionResponse(exception);
    }

    return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: isProduction
            ? 'Something went wrong. Please try again later.'
            : getDevelopmentMessage(exception),
    };
}

function createHttpExceptionResponse(exception: HttpException): ExceptionResponseBody {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
        return {
            statusCode,
            message: response,
        };
    }

    if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        const message = body.message;

        return {
            statusCode,
            message:
                typeof message === 'string' || Array.isArray(message) ? message : exception.message,
            ...(typeof body.error === 'string' ? { error: body.error } : {}),
        };
    }

    return {
        statusCode,
        message: exception.message,
    };
}

function getDevelopmentMessage(exception: unknown): string {
    if (exception instanceof Error) {
        return exception.message;
    }

    if (typeof exception === 'string') {
        return exception;
    }

    return 'Internal server error';
}
