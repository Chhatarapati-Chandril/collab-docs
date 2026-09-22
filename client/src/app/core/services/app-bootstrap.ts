import { Injectable, signal } from '@angular/core';

export const SPLASH_SCREEN_MIN_DISPLAY_MS = 600;

@Injectable({ providedIn: 'root' })
export class AppBootstrap {
    readonly isReady = signal(false);

    private resolveReady!: () => void;
    readonly readyPromise = new Promise<void>((resolve) => {
        this.resolveReady = resolve;
    });

    setReady() {
        this.isReady.set(true);
        this.resolveReady();
    }
}
