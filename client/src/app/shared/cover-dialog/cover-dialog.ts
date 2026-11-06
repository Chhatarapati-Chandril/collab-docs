import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import {
    COVER_CATEGORIES,
    COVER_TEMPLATES,
    CoverCategory,
    CoverTemplate,
} from '../../core/constants/cover-templates.constant';
import { Docs } from '../../core/services/docs';

export interface CoverDialogData {
    mode: 'create' | 'edit';
    currentCoverImageUrl?: string | null;
    currentCoverPublicId?: string | null;
    currentCoverType?: string | null;
    documentTitle?: string;
}

export interface CoverDialogResult {
    action: 'apply' | 'remove';
    coverImageUrl?: string | null;
    coverPublicId?: string | null;
    coverType?: 'TEMPLATE' | 'CUSTOM' | null;
}

@Component({
    selector: 'app-cover-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatProgressSpinnerModule,
        MatChipsModule,
    ],
    templateUrl: './cover-dialog.html',
    styleUrl: './cover-dialog.scss',
})
export class CoverDialog {
    private dialogRef = inject(MatDialogRef<CoverDialog, CoverDialogResult>);
    readonly data = inject<CoverDialogData>(MAT_DIALOG_DATA);
    private docsService = inject(Docs);

    readonly categories = COVER_CATEGORIES;
    readonly templates = COVER_TEMPLATES;

    readonly selectedCategory = signal<CoverCategory>('All');
    readonly activeTab = signal<'gallery' | 'upload'>('gallery');

    // Currently selected cover state
    readonly selectedUrl = signal<string>(this.data.currentCoverImageUrl || COVER_TEMPLATES[0].url);
    readonly selectedPublicId = signal<string | null>(this.data.currentCoverPublicId || null);
    readonly selectedType = signal<'TEMPLATE' | 'CUSTOM'>(
        (this.data.currentCoverType as 'TEMPLATE' | 'CUSTOM') || 'TEMPLATE',
    );
    readonly selectedTemplateId = signal<string | null>(
        COVER_TEMPLATES.find((t) => t.url === this.data.currentCoverImageUrl)?.id ||
            (!this.data.currentCoverImageUrl ? COVER_TEMPLATES[0].id : null),
    );

    // Upload state
    readonly isUploading = signal(false);
    readonly uploadError = signal<string | null>(null);
    readonly isDragging = signal(false);

    readonly filteredTemplates = computed(() => {
        const cat = this.selectedCategory();
        if (cat === 'All') {
            return this.templates;
        }
        return this.templates.filter((t) => t.category === cat);
    });

    readonly hasExistingCover = computed(() => !!this.data.currentCoverImageUrl);

    selectCategory(cat: CoverCategory): void {
        this.selectedCategory.set(cat);
    }

    selectTemplate(template: CoverTemplate): void {
        this.selectedUrl.set(template.url);
        this.selectedPublicId.set(null);
        this.selectedType.set('TEMPLATE');
        this.selectedTemplateId.set(template.id);
        this.uploadError.set(null);
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFileSelected(files[0]);
        }
    }

    onFileInputChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.handleFileSelected(input.files[0]);
        }
    }

    private async handleFileSelected(file: File): Promise<void> {
        this.uploadError.set(null);

        // MIME validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.uploadError.set('Please select a valid image format: JPEG, PNG, or WebP.');
            return;
        }

        // 5 MB size limit
        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            this.uploadError.set('File is too large. Maximum allowed size is 5 MB.');
            return;
        }

        this.isUploading.set(true);
        try {
            const res = await this.docsService.uploadCoverImage(file);
            this.selectedUrl.set(res.secureUrl);
            this.selectedPublicId.set(res.publicId);
            this.selectedType.set('CUSTOM');
            this.selectedTemplateId.set(null);
        } catch (err: unknown) {
            const error = err as { error?: { message?: string }; message?: string };
            const msg =
                error?.error?.message ||
                error?.message ||
                'Failed to upload image. Please try again.';
            this.uploadError.set(msg);
        } finally {
            this.isUploading.set(false);
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onRemoveCover(): void {
        this.dialogRef.close({
            action: 'remove',
            coverImageUrl: null,
            coverPublicId: null,
            coverType: null,
        });
    }

    onConfirm(): void {
        if (!this.selectedUrl()) {
            return;
        }

        this.dialogRef.close({
            action: 'apply',
            coverImageUrl: this.selectedUrl(),
            coverPublicId: this.selectedPublicId(),
            coverType: this.selectedType(),
        });
    }
}
