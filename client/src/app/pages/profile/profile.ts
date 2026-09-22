import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Auth } from '../../core/services/auth';
import { Users } from '../../core/services/users';
import { Notifier } from '../../shared/services/notifier';
import { PROFILE_CONSTANTS } from './profile.constants';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { getColorForUser, getInitial } from '../../shared/utils/avatar.util';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatTooltipModule,
    ],
    templateUrl: './profile.html',
    styleUrl: './profile.scss',
})
export class Profile {
    private auth = inject(Auth);
    private usersService = inject(Users);
    private notifier = inject(Notifier);

    readonly CONSTANTS = PROFILE_CONSTANTS;
    readonly user = this.auth.user;

    readonly getColorForUser = getColorForUser;
    readonly getInitial = getInitial;

    readonly isEditingName = signal(false);
    readonly nameControl = new FormControl('', {
        validators: [
            Validators.required,
            Validators.minLength(2),
            Validators.pattern(/^[^\s]+(\s+[^\s]+)*$/),
        ],
        nonNullable: true,
    });

    @ViewChild('nameInput') nameInputRef?: ElementRef<HTMLInputElement>;

    constructor() {
        effect(() => {
            const currentUser = this.user();
            if (currentUser && !this.isEditingName()) {
                this.nameControl.setValue(currentUser.displayName);
            }
        });
    }

    startEditingName(): void {
        this.isEditingName.set(true);
        setTimeout(() => {
            if (this.nameInputRef) {
                this.nameInputRef.nativeElement.focus();
                this.nameInputRef.nativeElement.select();
            }
        });
    }

    cancelEditingName(): void {
        const currentUser = this.user();
        if (currentUser) {
            this.nameControl.setValue(currentUser.displayName);
        }
        this.isEditingName.set(false);
    }

    async saveName(): Promise<void> {
        if (this.nameControl.invalid || !this.nameControl.dirty) {
            this.cancelEditingName();
            return;
        }

        const newName = this.nameControl.value.trim();
        const currentUser = this.user();
        if (newName === currentUser?.displayName) {
            this.cancelEditingName();
            return;
        }

        try {
            await this.usersService.updateProfile({ displayName: newName });

            // Re-fetch profile to sync the updated state globally across the app
            await this.auth.fetchProfile();

            this.notifier.showSuccess(this.CONSTANTS.saveSuccess);
            this.isEditingName.set(false);
        } catch (err) {
            this.notifier.showError(extractErrorMessage(err, this.CONSTANTS.saveFailed));
            // Let them try again, don't cancel editing on failure
        }
    }

    getNameErrorMessage(): string {
        if (this.nameControl.hasError('required')) return this.CONSTANTS.requiredError;
        if (this.nameControl.hasError('minlength')) return this.CONSTANTS.displayNameMinLength;
        if (this.nameControl.hasError('pattern')) return this.CONSTANTS.displayNamePatternError;
        return '';
    }
}
