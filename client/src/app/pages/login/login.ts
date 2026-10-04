import { Component, inject, AfterViewInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '../../core/services/auth';
import { Notifier } from '../../shared/services/notifier';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { environment } from '../../../environments/environment';
import { NOTIFIER_CONSTANTS } from '../../shared/services/notifier.constants';
import { getColorForUser } from '../../shared/utils/avatar.util';
import { ThemeService, ThemeType } from '../../core/services/theme';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [MatButtonToggleModule, MatIconModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class Login implements AfterViewInit {
    private authService = inject(Auth);
    private router = inject(Router);
    private notifier = inject(Notifier);
    readonly themeService = inject(ThemeService);

    readonly getColorForUser = getColorForUser;

    private isGoogleInitialized = false;

    constructor() {
        effect(() => {
            const theme = this.themeService.themeSig();
            this.tryRenderGoogleButton(theme);
        });
    }

    ngAfterViewInit(): void {
        if (typeof google === 'undefined' || !google?.accounts?.id) {
            this.notifier.showError(NOTIFIER_CONSTANTS.genericErrorMessage);
            return;
        }

        google.accounts.id.initialize({
            client_id: environment.GOOGLE_CLIENT_ID,
            callback: (response: google.accounts.id.CredentialResponse) =>
                this.handleGoogleLogin(response),
        });

        this.isGoogleInitialized = true;
        this.tryRenderGoogleButton(this.themeService.themeSig());
    }

    private tryRenderGoogleButton(theme: ThemeType): void {
        if (!this.isGoogleInitialized) return;

        const container = document.getElementById('googleButtonContainer');
        if (container && typeof google !== 'undefined' && google?.accounts?.id) {
            const isDark =
                theme === 'dark' ||
                (theme === 'system' &&
                    window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches);

            // Re-rendering on the same container automatically clears the previous button
            google.accounts.id.renderButton(container, {
                theme: isDark ? 'filled_blue' : 'filled_black',
                size: 'large',
                width: 300,
                type: 'standard',
            });
        }
    }

    private handleGoogleLogin(response: google.accounts.id.CredentialResponse): void {
        this.authService
            .googleLogin(response.credential)
            .then(() => this.router.navigate(['/home']))
            .catch((err: unknown) => {
                const msg = extractErrorMessage(err);
                this.notifier.showError(msg);
            });
    }
}
