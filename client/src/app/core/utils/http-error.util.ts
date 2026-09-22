import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
        const message = err.error?.error?.message;
        if (Array.isArray(message)) return message[0];
        if (typeof message === 'string') return message;
    }
    return fallback;
}
