import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth } from '../../core/services/auth';
import { extractErrorMessage } from '../../core/utils/http-error.util';

@Component({
    selector: 'app-login',
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
    templateUrl: './login.html',
    styleUrl: '../../shared/styles/auth.scss',
})
export class Login {
    private fb = inject(FormBuilder);
    private authService = inject(Auth);
    private router = inject(Router);

    isLoading = signal(false);
    errorMessage = signal<string | null>(null);

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
    });

    onSubmit(): void {
        if (this.loginForm.invalid) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const { email, password } = this.loginForm.getRawValue();

        this.authService
            .login({ email: email!, password: password! })
            .then(() => this.router.navigate(['/home']))
            .catch((err) => {
                this.errorMessage.set(extractErrorMessage(err, 'Login failed. Please try again.'));
            })
            .finally(() => this.isLoading.set(false));
    }
}
