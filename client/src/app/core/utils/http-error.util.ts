import { HttpErrorResponse } from '@angular/common/http';

import { NOTIFIER_CONSTANTS } from '../../shared/services/notifier.constants';

export function extractErrorMessage(
    err: unknown,
    fallback: string = NOTIFIER_CONSTANTS.genericErrorMessage,
): string {
    if (err instanceof HttpErrorResponse) {
        const message = err.error?.error?.message;
        if (Array.isArray(message)) return message[0];
        if (typeof message === 'string') return message;
    }
    return fallback;
}
