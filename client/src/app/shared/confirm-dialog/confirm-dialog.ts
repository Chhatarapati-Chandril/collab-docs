import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CONFIRM_DIALOG } from './confirm-dialog.constants';

export interface ConfirmDialogData {
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

@Component({
    selector: 'app-confirm-dialog',
    imports: [MatDialogModule, MatButtonModule],
    templateUrl: './confirm-dialog.html',
    styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
    private dialogRef = inject(MatDialogRef<ConfirmDialog>);
    private data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

    readonly title = this.data?.title ?? CONFIRM_DIALOG.defaultTitle;
    readonly message = this.data?.message ?? CONFIRM_DIALOG.defaultMessage;
    readonly confirmLabel = this.data?.confirmLabel ?? CONFIRM_DIALOG.defaultConfirmLabel;
    readonly cancelLabel = this.data?.cancelLabel ?? CONFIRM_DIALOG.defaultCancelLabel;

    onCancel(): void {
        this.dialogRef.close(false);
    }

    onConfirm(): void {
        this.dialogRef.close(true);
    }
}
