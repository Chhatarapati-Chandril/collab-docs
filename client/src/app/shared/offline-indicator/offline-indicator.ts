import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Collab } from '../../core/services/collab';
import { OFFLINE_INDICATOR_CONSTANTS } from './offline-indicator.constants';

@Component({
    selector: 'app-offline-indicator',
    imports: [MatIconModule],
    templateUrl: './offline-indicator.html',
    styleUrl: './offline-indicator.scss',
})
export class OfflineIndicator {
    private collab = inject(Collab);

    readonly OFFLINE_INDICATOR_CONSTANTS = OFFLINE_INDICATOR_CONSTANTS;

    readonly status = this.collab.status;

    // Latch: flips to true the first time the socket reaches 'connected'.
    // The banner must not show on the initial connecting → connected handshake —
    // only when a previously-live connection drops mid-session.
    private readonly hasConnectedOnce = signal(false);

    constructor() {
        effect(() => {
            if (this.collab.status() === 'connected') {
                this.hasConnectedOnce.set(true);
            }
        });
    }

    readonly isVisible = computed(
        () => this.hasConnectedOnce() && this.collab.status() !== 'connected',
    );
}
