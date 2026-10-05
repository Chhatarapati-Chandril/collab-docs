import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppBootstrap } from './core/services/app-bootstrap';
import { SplashScreen } from './shared/splash-screen/splash-screen';
import { Auth } from './core/services/auth';
import { Notifications } from './core/services/notifications';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, SplashScreen],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    private bootstrap = inject(AppBootstrap);
    private auth = inject(Auth);
    private notifications = inject(Notifications);

    readonly isReady = this.bootstrap.isReady;
    readonly isFullyHidden = signal(false);

    constructor() {
        effect(() => {
            if (this.isReady()) {
                setTimeout(() => this.isFullyHidden.set(true), 300);
            }
        });

        effect(() => {
            const token = this.auth.accessToken;
            if (token) {
                this.notifications.connectSocket(token);
                this.notifications.requestNotificationPermission();
            } else {
                this.notifications.disconnectSocket();
            }
        });
    }
}
