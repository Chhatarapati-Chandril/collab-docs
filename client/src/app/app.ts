import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppBootstrap } from './core/services/app-bootstrap';
import { SplashScreen } from './shared/splash-screen/splash-screen';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, SplashScreen],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    private bootstrap = inject(AppBootstrap);

    readonly isReady = this.bootstrap.isReady;
    readonly isFullyHidden = signal(false);

    constructor() {
        effect(() => {
            if (this.isReady()) {
                // Wait 300ms for the CSS fade transition to finish before removing from DOM
                setTimeout(() => this.isFullyHidden.set(true), 300);
            }
        });
    }
}
