import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NOTIFIER_CONSTANTS } from './notifier.constants';

@Injectable({ providedIn: 'root' })
export class Notifier {
    private snackBar = inject(MatSnackBar);

    showError(message: string): void {
        this.snackBar.open(message, NOTIFIER_CONSTANTS.actionLabel, {
            ...NOTIFIER_CONSTANTS.baseConfig,
            panelClass: NOTIFIER_CONSTANTS.panelClasses.error,
        });
    }

    showSuccess(message: string): void {
        this.snackBar.open(message, NOTIFIER_CONSTANTS.actionLabel, {
            ...NOTIFIER_CONSTANTS.baseConfig,
            panelClass: NOTIFIER_CONSTANTS.panelClasses.success,
        });
    }
}
