import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AiDocSyncEvent {
    type: 'INSERT' | 'REPLACE';
    docId: string;
    text: string;
}

@Injectable({ providedIn: 'root' })
export class AiDocSync {
    private channel: BroadcastChannel | null = null;
    private eventSubject$ = new Subject<AiDocSyncEvent>();

    readonly events$ = this.eventSubject$.asObservable();

    constructor() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.channel = new BroadcastChannel('collabdocs-ai-doc-sync');
            this.channel.onmessage = (event: MessageEvent<AiDocSyncEvent>) => {
                if (event.data && (event.data.type === 'INSERT' || event.data.type === 'REPLACE')) {
                    this.eventSubject$.next(event.data);
                }
            };
        }
    }

    broadcast(event: AiDocSyncEvent): void {
        // Emit locally for any subscribers in the same tab
        this.eventSubject$.next(event);

        // Broadcast across tabs
        if (this.channel) {
            try {
                this.channel.postMessage(event);
            } catch {
                // Fallback for environments without BroadcastChannel serialization
            }
        }
    }
}
