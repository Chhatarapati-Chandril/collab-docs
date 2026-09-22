import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface RenameDialogData {
    currentTitle: string;
}

@Component({
    selector: 'app-rename-dialog',
    standalone: true,
    imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    templateUrl: './rename-dialog.html',
    styleUrl: './rename-dialog.scss',
})
export class RenameDialog {
    private dialogRef = inject(MatDialogRef<RenameDialog>);
    private data = inject<RenameDialogData>(MAT_DIALOG_DATA);

    title = this.data.currentTitle;

    onCancel(): void {
        this.dialogRef.close();
    }

    onConfirm(): void {
        if (this.title.trim()) {
            this.dialogRef.close(this.title.trim());
        }
    }
}
