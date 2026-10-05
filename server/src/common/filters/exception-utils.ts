import { HttpException } from '@nestjs/common';

export function isHttpException(exception: unknown): exception is HttpException {
    return exception instanceof HttpException;
}

export function getExceptionMessage(exception: unknown): string {
    if (exception instanceof Error) {
        return exception.message;
    }

    if (typeof exception === 'string') {
        return exception;
    }

    return 'Unknown error';
}

export function getExceptionStack(exception: unknown): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
}
