import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Docs } from '../../core/services/docs';
import { Document } from '../../core/models/doc.model';
import { DocCard } from '../../shared/doc-card/doc-card';
import { appLogger } from '../../core/utils/app-logger.util';
import { RenameDialog, RenameDialogData } from '../../shared/rename-dialog/rename-dialog';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { SharePanel, SharePanelData } from '../../shared/share-panel/share-panel';
import {
    CoverDialog,
    CoverDialogData,
    CoverDialogResult,
} from '../../shared/cover-dialog/cover-dialog';
import { MatDialog } from '@angular/material/dialog';
import { HOME_CONSTANTS } from './home.constants';

export type DocFilter = 'all' | 'owned' | 'shared';
export type DocumentWithOwnership = Document & { isOwner: boolean };

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatButtonToggleModule,
        MatMenuModule,
        MatSnackBarModule,
        DocCard,
    ],
    templateUrl: './home.html',
    styleUrl: './home.scss',
})
export class Home implements OnInit {
    private docsService = inject(Docs);
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);

    readonly CONSTANTS = HOME_CONSTANTS;

    isLoading = signal(true);
    allDocuments = signal<DocumentWithOwnership[]>([]);
    filterSig = signal<DocFilter>('all');
    viewModeSig = signal<'grid' | 'list'>('grid');

    constructor() {
        try {
            const savedMode = localStorage.getItem(HOME_CONSTANTS.viewModeKey);
            if (savedMode === 'list' || savedMode === 'grid') {
                this.viewModeSig.set(savedMode);
            }
        } catch (e) {
            appLogger.warn(`Failed to read view mode from localStorage: ${e}`);
        }
    }

    setViewMode(mode: 'grid' | 'list'): void {
        this.viewModeSig.set(mode);
        try {
            localStorage.setItem(HOME_CONSTANTS.viewModeKey, mode);
        } catch (e) {
            appLogger.warn(`Failed to save view mode to localStorage: ${e}`);
        }
    }

    filteredDocuments = computed(() => {
        const docs = this.allDocuments();
        const filter = this.filterSig();

        let filtered = docs;
        if (filter === 'owned') {
            filtered = docs.filter((d) => d.isOwner);
        } else if (filter === 'shared') {
            filtered = docs.filter((d) => !d.isOwner);
        }

        return filtered.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    });

    ngOnInit(): void {
        this.loadDocuments();
    }

    private async loadDocuments(): Promise<void> {
        this.isLoading.set(true);
        try {
            const res = await this.docsService.getDocuments();
            const owned = res.myDocuments.documents.map((d) => ({ ...d, isOwner: true }));
            const shared = res.sharedWithMe.documents.map((d) => ({ ...d, isOwner: false }));
            this.allDocuments.set([...owned, ...shared]);
        } catch {
            appLogger.error('Failed to load documents');
            // TODO: surface a snackbar/toast to the user
        } finally {
            this.isLoading.set(false);
        }
    }

    async onCreate(): Promise<void> {
        return this.onCreateBlank();
    }

    async onCreateBlank(): Promise<void> {
        try {
            const doc = await this.docsService.createDocument();
            this.router.navigate(['/editor', doc.id]);
        } catch {
            this.snackBar.open('Failed to create document', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
        }
    }

    onCreateWithCover(): void {
        const dialogRef = this.dialog.open<CoverDialog, CoverDialogData, CoverDialogResult>(
            CoverDialog,
            {
                data: {
                    mode: 'create',
                    documentTitle: 'Untitled Document',
                },
                width: '880px',
                maxWidth: '92vw',
                panelClass: 'cover-dialog-panel',
            },
        );

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.action === 'apply' && result.coverImageUrl) {
                try {
                    const doc = await this.docsService.createDocument({
                        title: 'Untitled Document',
                        coverImageUrl: result.coverImageUrl,
                        coverPublicId: result.coverPublicId,
                        coverType: result.coverType,
                    });
                    this.router.navigate(['/editor', doc.id]);
                } catch {
                    this.snackBar.open('Failed to create document with cover', 'Close', {
                        duration: 3000,
                        panelClass: 'error-snackbar',
                    });
                }
            }
        });
    }

    onChangeCover(doc: Document): void {
        const dialogRef = this.dialog.open<CoverDialog, CoverDialogData, CoverDialogResult>(
            CoverDialog,
            {
                data: {
                    mode: 'edit',
                    currentCoverImageUrl: doc.coverImageUrl,
                    currentCoverPublicId: doc.coverPublicId,
                    currentCoverType: doc.coverType,
                    documentTitle: doc.title,
                },
                width: '880px',
                maxWidth: '92vw',
                panelClass: 'cover-dialog-panel',
            },
        );

        dialogRef.afterClosed().subscribe(async (result) => {
            if (!result) return;

            if (result.action === 'apply' && result.coverImageUrl) {
                // Optimistic UI update
                const oldDoc: DocumentWithOwnership = {
                    ...doc,
                    isOwner: (doc as DocumentWithOwnership).isOwner ?? true,
                };
                this.allDocuments.update((docs) =>
                    docs.map((d) =>
                        d.id === doc.id
                            ? {
                                  ...d,
                                  coverImageUrl: result.coverImageUrl,
                                  coverPublicId: result.coverPublicId,
                                  coverType: result.coverType,
                              }
                            : d,
                    ),
                );

                try {
                    await this.docsService.setCover(doc.id, {
                        coverImageUrl: result.coverImageUrl,
                        coverPublicId: result.coverPublicId,
                        coverType: result.coverType,
                    });
                    this.snackBar.open('Document cover updated', undefined, {
                        duration: 2500,
                        panelClass: 'success-snackbar',
                    });
                } catch {
                    // Revert on error
                    this.allDocuments.update((docs) =>
                        docs.map((d) => (d.id === doc.id ? oldDoc : d)),
                    );
                    this.snackBar.open('Failed to update cover', 'Close', {
                        duration: 3000,
                        panelClass: 'error-snackbar',
                    });
                }
            } else if (result.action === 'remove') {
                const oldDoc: DocumentWithOwnership = {
                    ...doc,
                    isOwner: (doc as DocumentWithOwnership).isOwner ?? true,
                };
                this.allDocuments.update((docs) =>
                    docs.map((d) =>
                        d.id === doc.id
                            ? {
                                  ...d,
                                  coverImageUrl: null,
                                  coverPublicId: null,
                                  coverType: null,
                              }
                            : d,
                    ),
                );

                try {
                    await this.docsService.removeCover(doc.id);
                    this.snackBar.open('Document cover removed', undefined, {
                        duration: 2500,
                        panelClass: 'success-snackbar',
                    });
                } catch {
                    this.allDocuments.update((docs) =>
                        docs.map((d) => (d.id === doc.id ? oldDoc : d)),
                    );
                    this.snackBar.open('Failed to remove cover', 'Close', {
                        duration: 3000,
                        panelClass: 'error-snackbar',
                    });
                }
            }
        });
    }

    onOpen(id: string): void {
        this.router.navigate(['/editor', id]);
    }

    onRename(doc: Document): void {
        const dialogRef = this.dialog.open<RenameDialog, RenameDialogData, string>(RenameDialog, {
            data: { currentTitle: doc.title },
        });

        dialogRef.afterClosed().subscribe(async (newTitle) => {
            if (newTitle && newTitle !== doc.title) {
                // Optimistic UI Update
                this.allDocuments.update((docs) =>
                    docs.map((d) => (d.id === doc.id ? { ...d, title: newTitle } : d)),
                );

                try {
                    await this.docsService.updateDocument(doc.id, { title: newTitle });
                } catch {
                    // Revert on error
                    this.allDocuments.update((docs) =>
                        docs.map((d) => (d.id === doc.id ? { ...d, title: doc.title } : d)),
                    );
                }
            }
        });
    }

    onShare(doc: Document): void {
        this.dialog.open<SharePanel, SharePanelData>(SharePanel, {
            data: { document: doc, isOwner: (doc as DocumentWithOwnership).isOwner },
            width: '800px',
            maxWidth: '90vw',
        });
    }

    async onCopy(id: string): Promise<void> {
        await this.docsService.copyDocument(id);
        this.loadDocuments(); // refresh list to show the new copy
    }

    onDelete(id: string): void {
        const dialogRef = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(
            ConfirmDialog,
            {
                data: HOME_CONSTANTS.deleteDialog,
            },
        );

        dialogRef.afterClosed().subscribe(async (confirmed) => {
            if (confirmed) {
                await this.docsService.deleteDocument(id);
                this.loadDocuments();
            }
        });
    }
}
