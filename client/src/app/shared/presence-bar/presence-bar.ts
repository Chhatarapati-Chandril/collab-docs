import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { Awareness } from 'y-protocols/awareness';
import { Collab } from '../../core/services/collab';
import { PRESENCE_BAR_CONSTANTS } from './presence-bar.constants';
import { getInitial } from '../utils/avatar.util';

export interface PresenceUser {
    clientId: number;
    name: string;
    color: string;
    initials: string;
    isAnonymous: boolean;
    avatarEmoji: string | null;
}

@Component({
    selector: 'app-presence-bar',
    imports: [],
    templateUrl: './presence-bar.html',
    styleUrl: './presence-bar.scss',
})
export class PresenceBar implements OnDestroy {
    private collab = inject(Collab);

    readonly PRESENCE_BAR_CONSTANTS = PRESENCE_BAR_CONSTANTS;

    private currentAwareness: Awareness | null = null;
    private readonly onAwarenessUpdate = () => this.refreshUsers();

    readonly users = signal<PresenceUser[]>([]);

    readonly visibleUsers = computed(() =>
        this.users().slice(0, PRESENCE_BAR_CONSTANTS.maxVisible),
    );

    readonly overflowCount = computed(() =>
        Math.max(0, this.users().length - PRESENCE_BAR_CONSTANTS.maxVisible),
    );

    readonly overflowTooltip = computed(() => {
        const count = this.overflowCount();
        return count > 0
            ? `${PRESENCE_BAR_CONSTANTS.overflowTooltipPrefix} ${count} ${PRESENCE_BAR_CONSTANTS.overflowTooltipSuffix}`
            : '';
    });

    constructor() {
        effect(() => {
            const status = this.collab.status();
            if (status === 'disconnected') {
                this.detachAwareness();
                this.users.set([]);
            } else if (!this.currentAwareness) {
                const awareness = this.collab.getAwareness();
                if (awareness) {
                    this.attachAwareness(awareness);
                }
            }
        });
    }

    private attachAwareness(awareness: Awareness): void {
        this.currentAwareness = awareness;
        awareness.on('update', this.onAwarenessUpdate);
        this.refreshUsers();
    }

    private detachAwareness(): void {
        this.currentAwareness?.off('update', this.onAwarenessUpdate);
        this.currentAwareness = null;
    }

    private refreshUsers(): void {
        const awareness = this.collab.getAwareness();
        if (!awareness) return;

        const entries: PresenceUser[] = [];
        awareness.getStates().forEach((state, clientId) => {
            const user = state['user'] as
                | {
                      name?: string;
                      color?: string;
                      isAnonymous?: boolean;
                      avatarEmoji?: string;
                  }
                | undefined;
            if (user) {
                const name = user.name ?? PRESENCE_BAR_CONSTANTS.anonName;
                const isAnonymous = user.isAnonymous ?? false;
                const avatarEmoji = isAnonymous ? (user.avatarEmoji ?? null) : null;
                entries.push({
                    clientId,
                    name,
                    color: user.color ?? '#9e9e9e',
                    initials: getInitial(name),
                    isAnonymous,
                    avatarEmoji,
                });
            }
        });

        this.users.set(entries);
    }

    ngOnDestroy(): void {
        this.detachAwareness();
    }
}
