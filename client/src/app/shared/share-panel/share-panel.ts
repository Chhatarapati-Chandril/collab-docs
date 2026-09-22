import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { Document, Permission } from '../../core/models/doc.model';
import { User } from '../../core/models/user.model';
import { Share, DocPermissionUser } from '../../core/services/share';
import { Users } from '../../core/services/users';
import { SHARE_PANEL_CONSTANTS } from './share-panel.constants';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { Notifier } from '../services/notifier';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';
import { getInitial, getColorForUser } from '../utils/avatar.util';

export interface SharePanelData {
    document: Document;
}

@Component({
    selector: 'app-share-panel',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatFormFieldModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
    ],
    templateUrl: './share-panel.html',
    styleUrl: './share-panel.scss',
})
export class SharePanel implements OnInit, OnDestroy {
    private shareService = inject(Share);
    private usersService = inject(Users);
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<SharePanel>);
    private dialog = inject(MatDialog);
    private notifier = inject(Notifier);

    readonly data = inject<SharePanelData>(MAT_DIALOG_DATA);
    readonly SHARE_PANEL_CONSTANTS = SHARE_PANEL_CONSTANTS;

    readonly getInitial = getInitial;
    readonly getColorForUser = getColorForUser;

    // Manage access state
    readonly documentUsers = signal<DocPermissionUser[]>([]);
    readonly isLoadingUsers = signal(true);
    readonly usersError = signal<string | null>(null);

    // Email share form
    readonly shareForm = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        permission: ['EDITOR' as Permission, [Validators.required]],
    });

    readonly isSharing = signal(false);
    readonly shareError = signal<string | null>(null);

    // Autocomplete state
    readonly suggestedUsers = signal<User[]>([]);
    readonly isSearching = signal(false);
    private searchSubscription?: Subscription;

    // Public access state
    readonly publicAccess = signal<Permission | null>(this.data.document.publicAccess);
    readonly isUpdatingAccess = signal(false);
    readonly accessError = signal<string | null>(null);

    ngOnInit(): void {
        this.loadDocumentUsers();
        this.searchSubscription = this.shareForm.controls.email.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                switchMap((email) => {
                    if (!email || email.trim().length === 0) {
                        return of([]);
                    }
                    this.isSearching.set(true);
                    return this.usersService.searchUsers(email).catch(() => [] as User[]);
                }),
            )
            .subscribe((users) => {
                this.suggestedUsers.set(users);
                this.isSearching.set(false);
            });
    }

    ngOnDestroy(): void {
        this.searchSubscription?.unsubscribe();
    }

    private async loadDocumentUsers(): Promise<void> {
        this.isLoadingUsers.set(true);
        this.usersError.set(null);
        try {
            const users = await this.shareService.getDocumentUsers(this.data.document.id);
            this.documentUsers.set(users);
        } catch (err) {
            this.usersError.set(extractErrorMessage(err, 'Failed to load document users'));
        } finally {
            this.isLoadingUsers.set(false);
        }
    }

    async changeUserPermission(
        docUser: DocPermissionUser,
        newPermission: Permission,
    ): Promise<void> {
        try {
            await this.shareService.shareViaEmail({
                docId: this.data.document.id,
                email: docUser.user.email,
                permission: newPermission,
            });
            // Update local state
            this.documentUsers.update((users) =>
                users.map((u) => (u.id === docUser.id ? { ...u, permission: newPermission } : u)),
            );
            this.notifier.showSuccess(SHARE_PANEL_CONSTANTS.permissionUpdateSuccess);
        } catch (err) {
            this.notifier.showError(extractErrorMessage(err, 'Failed to update permission'));
            // Revert value in the UI by triggering a re-render of the list
            this.documentUsers.set([...this.documentUsers()]);
        }
    }

    revokeUserAccess(docUser: DocPermissionUser): void {
        const dialogRef = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(
            ConfirmDialog,
            {
                data: {
                    title: SHARE_PANEL_CONSTANTS.revokeConfirmTitle,
                    message: SHARE_PANEL_CONSTANTS.revokeConfirmMsg,
                    confirmLabel: 'Revoke',
                    cancelLabel: 'Cancel',
                },
            },
        );

        dialogRef.afterClosed().subscribe(async (confirmed) => {
            if (confirmed) {
                try {
                    await this.shareService.removePermission(
                        this.data.document.id,
                        docUser.user.id,
                    );
                    this.documentUsers.update((users) => users.filter((u) => u.id !== docUser.id));
                    this.notifier.showSuccess(SHARE_PANEL_CONSTANTS.revokeSuccess);
                } catch (err) {
                    this.notifier.showError(extractErrorMessage(err, 'Failed to revoke access'));
                }
            }
        });
    }

    async onShareSubmit(): Promise<void> {
        if (this.shareForm.invalid) return;

        this.isSharing.set(true);
        this.shareError.set(null);

        try {
            await this.shareService.shareViaEmail({
                docId: this.data.document.id,
                email: this.shareForm.controls.email.value,
                permission: this.shareForm.controls.permission.value,
            });
            this.shareForm.controls.email.reset();
            this.notifier.showSuccess(SHARE_PANEL_CONSTANTS.inviteSuccess);
        } catch (err) {
            this.shareError.set(extractErrorMessage(err, 'Failed to share document'));
        } finally {
            this.isSharing.set(false);
        }
    }

    async onPublicAccessChange(newAccess: Permission | 'RESTRICTED'): Promise<void> {
        const payloadAccess = newAccess === 'RESTRICTED' ? null : newAccess;

        this.isUpdatingAccess.set(true);
        this.accessError.set(null);

        try {
            const updatedDoc = await this.shareService.updatePublicAccess(this.data.document.id, {
                publicAccess: payloadAccess,
            });
            this.publicAccess.set(updatedDoc.publicAccess);
            // Optionally, update the reference data so the parent component gets the new state
            this.data.document.publicAccess = updatedDoc.publicAccess;
        } catch (err) {
            this.accessError.set(extractErrorMessage(err, 'Failed to update general access'));
            // Revert on failure by re-setting to previous value
            this.publicAccess.set(this.data.document.publicAccess);
        } finally {
            this.isUpdatingAccess.set(false);
        }
    }
}
