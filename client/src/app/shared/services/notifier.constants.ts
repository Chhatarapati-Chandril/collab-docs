import { MatSnackBarConfig } from '@angular/material/snack-bar';

export const NOTIFIER_CONSTANTS = {
    genericErrorMessage: 'Something went wrong. Please try again.',
    actionLabel: 'Dismiss',
    baseConfig: {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
    } as MatSnackBarConfig,
    panelClasses: {
        error: 'error-snackbar',
        success: 'success-snackbar',
    },
} as const;
