import { environment } from '../../../environments/environment';

const PREFIX = '[CollabDocs]';

function log(style: string, label: string, message: string): void {
    if (environment.production) return; // keep prod console clean
    console.log(`%c${PREFIX} ${label}`, style, message);
}

export const appLogger = {
    info: (message: string) => log('color: #2196f3; font-weight: bold;', 'ℹ', message),
    success: (message: string) => log('color: #4caf50; font-weight: bold;', '✓', message),
    warn: (message: string) => log('color: #ff9800; font-weight: bold;', '⚠', message),
    error: (message: string) => log('color: #f44336; font-weight: bold;', '✗', message),
};
