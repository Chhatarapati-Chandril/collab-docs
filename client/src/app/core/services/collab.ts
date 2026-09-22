import { Injectable, computed, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { Auth } from './auth';
import { appLogger } from '../utils/app-logger.util';
import { Permission } from '../models/doc.model';
import { environment } from '../../../environments/environment';
import { ANONYMOUS_IDENTITIES } from '../../shared/presence-bar/anonymous-identities.constants';
import { getColorForUser } from '../../shared/utils/avatar.util';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const REMOTE_ORIGIN = 'remote';

@Injectable({ providedIn: 'root' })
export class Collab {
    private authService = inject(Auth);

    private socket: Socket | null = null;
    private ydoc: Y.Doc | null = null;
    private currentDocId: string | null = null;
    private awareness: Awareness | null = null;

    private statusSig = signal<ConnectionStatus>('disconnected');
    private accessRevokedSig = signal(false);
    private documentDeletedSig = signal(false);
    private errorMessageSig = signal<string | null>(null);
    private roleSig = signal<Permission | null>(null);
    private isAnonymousSig = signal<boolean | null>(null);
    private anonymousIdentityIndex: number | null = null;

    readonly status = this.statusSig.asReadonly();
    readonly isConnected = computed(() => this.statusSig() === 'connected');
    readonly accessRevoked = this.accessRevokedSig.asReadonly();
    readonly documentDeleted = this.documentDeletedSig.asReadonly();
    readonly errorMessage = this.errorMessageSig.asReadonly();
    readonly role = this.roleSig.asReadonly();
    readonly isAnonymous = this.isAnonymousSig.asReadonly();
    readonly canEdit = computed(() => this.roleSig() !== 'VIEWER' && this.roleSig() !== null);

    readonly getAwareness = () => this.awareness;

    connect(docId: string): Y.Doc {
        if (this.socket && this.currentDocId === docId) {
            return this.ydoc!;
        }
        this.disconnect(); // tear down any previous doc/socket/awareness first

        this.currentDocId = docId;
        this.ydoc = new Y.Doc();
        this.awareness = new Awareness(this.ydoc);

        this.statusSig.set('connecting');
        this.accessRevokedSig.set(false);
        this.documentDeletedSig.set(false);
        this.errorMessageSig.set(null);
        this.roleSig.set(null);
        this.isAnonymousSig.set(null);
        this.anonymousIdentityIndex = Math.floor(Math.random() * ANONYMOUS_IDENTITIES.length);

        this.socket = io(`${environment.socketUrl}/docs`, {
            auth: {
                token: this.authService.accessToken,
                docId,
            },
        });

        this.registerListeners();
        return this.ydoc;
    }

    private registerListeners(): void {
        const socket = this.socket!;
        const ydoc = this.ydoc!;
        const awareness = this.awareness!;

        socket.on('connect', () => {
            this.statusSig.set('connected');
            appLogger.success(`Socket connected — document ${this.currentDocId}`);
        });

        socket.on('disconnect', (reason: string) => {
            this.statusSig.set('disconnected');
            appLogger.warn(`Socket disconnected: ${reason}`);
        });

        socket.on('connect_error', (err: Error) => {
            this.statusSig.set('disconnected');
            appLogger.error(`Socket connection failed: ${err.message}`);
        });

        socket.on('sync', (data: ArrayBuffer) => {
            Y.applyUpdate(ydoc, new Uint8Array(data), REMOTE_ORIGIN);
            appLogger.success('Initial document state synced');
        });

        socket.on('session', (payload: { role: Permission; isAnonymous: boolean }) => {
            this.roleSig.set(payload.role);
            this.isAnonymousSig.set(payload.isAnonymous);
            this.updateLocalAwarenessUser(payload.isAnonymous);
            appLogger.info(`Session role: ${payload.role}, isAnonymous: ${payload.isAnonymous}`);
        });

        socket.on('update', (data: ArrayBuffer) => {
            Y.applyUpdate(ydoc, new Uint8Array(data), REMOTE_ORIGIN);
        });

        // Awareness already drops the peer's cursor/presence state automatically
        // (via the 'removed' array in awareness's own 'update' event below).
        // This listener is just for a clean log line — no separate presence signal needed.
        socket.on('user-left', (payload: { userId: string }) => {
            appLogger.info(`User left the document: ${payload.userId}`);
        });

        socket.on('access-revoked', (payload: { message: string }) => {
            this.accessRevokedSig.set(true);
            this.errorMessageSig.set(payload.message);
            appLogger.error(`Access revoked: ${payload.message}`);
        });

        socket.on('document-deleted', (payload: { message: string }) => {
            this.documentDeletedSig.set(true);
            this.errorMessageSig.set(payload.message);
            appLogger.error(`Document deleted: ${payload.message}`);
        });

        socket.on('error', (payload: { message: string }) => {
            this.errorMessageSig.set(payload.message);
            appLogger.error(`Collab error: ${payload.message}`);
        });

        // Forward LOCAL edits to the server; skip re-broadcasting updates we just applied FROM the server
        ydoc.on('update', (update: Uint8Array, origin: unknown) => {
            if (origin === REMOTE_ORIGIN) return;
            socket.emit('update', update);
        });

        socket.on('awareness-update', (data: ArrayBuffer) => {
            applyAwarenessUpdate(awareness, new Uint8Array(data), REMOTE_ORIGIN);
        });

        awareness.on(
            'update',
            (
                {
                    added,
                    updated,
                    removed,
                }: { added: number[]; updated: number[]; removed: number[] },
                origin: unknown,
            ) => {
                if (origin === REMOTE_ORIGIN) return; // don't re-broadcast remote-originated changes
                const changedClients = [...added, ...updated, ...removed];
                const update = encodeAwarenessUpdate(awareness, changedClients);
                socket.emit('awareness-update', update);
            },
        );
    }

    private updateLocalAwarenessUser(isAnonymous: boolean): void {
        if (!this.awareness) return;

        if (isAnonymous) {
            const idx = this.anonymousIdentityIndex ?? 0;
            const identity = ANONYMOUS_IDENTITIES[idx % ANONYMOUS_IDENTITIES.length];
            const name = `Anonymous ${identity.name}`;
            this.awareness.setLocalStateField('user', {
                name,
                avatarEmoji: identity.emoji,
                color: getColorForUser(name),
                isAnonymous: true,
            });
        } else {
            const user = this.authService.user();
            const name = user?.displayName ?? 'Anonymous';
            this.awareness.setLocalStateField('user', {
                name,
                color: getColorForUser(user?.id ?? name),
                isAnonymous: false,
            });
        }
    }

    disconnect(): void {
        this.socket?.disconnect();
        this.socket = null;
        this.awareness?.destroy();
        this.awareness = null;
        this.ydoc?.destroy();
        this.ydoc = null;
        this.currentDocId = null;
        this.statusSig.set('disconnected');
        this.roleSig.set(null);
        this.isAnonymousSig.set(null);
        this.anonymousIdentityIndex = null;
    }
}
