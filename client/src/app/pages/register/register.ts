import { Component, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth } from '../../core/services/auth';
import { extractErrorMessage } from '../../core/utils/http-error.util';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './register.html',
    styleUrl: '../../shared/styles/auth.scss',
})
export class Register {
    private fb = inject(FormBuilder);
    private authService = inject(Auth);
    private router = inject(Router);

    isLoading = signal(false);
    errorMessage = signal<string | null>(null);

    registerForm = this.fb.group(
        {
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required],
        },
        { validators: [Register.passwordsMatch] },
    );

    private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
        const password = group.get('password')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return password === confirm ? null : { passwordMismatch: true };
    }

    onSubmit(): void {
        if (this.registerForm.invalid) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const { name, email, password } = this.registerForm.getRawValue();

        this.authService
            .register({ email: email!, displayName: name!, password: password! })
            .then(() => this.router.navigate(['/login'])) // adjust if you decide to auto-login instead
            .catch((err) => {
                this.errorMessage.set(
                    extractErrorMessage(err, 'Registration failed. Please try again.'),
                );
            })
            .finally(() => this.isLoading.set(false));
    }
}
