import {
    Component,
    DestroyRef,
    ElementRef,
    OnInit,
    ViewChild,
    computed,
    inject,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import * as Y from 'yjs';
import { Docs } from '../../core/services/docs';
import { Collab } from '../../core/services/collab';
import { Ai } from '../../core/services/ai';
import { AiDocSync } from '../../core/services/ai-doc-sync';
import { Notifier } from '../../shared/services/notifier';
import { Document } from '../../core/models/doc.model';
import { formatMarkdownForDisplay } from '../../core/utils/markdown-to-html.util';
import {
    AiActionPayload,
    AiActionType,
    AiChatPayload,
    AiTone,
    ChatMessage,
} from '../../core/models/ai.model';
import { GEMINI_WORKSPACE_CONSTANTS } from './gemini-workspace.constants';

@Component({
    selector: 'app-gemini-workspace',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatIconModule,
        MatButtonModule,
        MatChipsModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatTooltipModule,
    ],
    templateUrl: './gemini-workspace.html',
    styleUrl: './gemini-workspace.scss',
})
export class GeminiWorkspace implements OnInit {
    private route = inject(ActivatedRoute);
    private docsService = inject(Docs);
    private collabService = inject(Collab);
    private aiService = inject(Ai);
    private aiDocSync = inject(AiDocSync);
    private notifier = inject(Notifier);
    private destroyRef = inject(DestroyRef);

    @ViewChild('messagesScrollArea') private messagesScrollArea?: ElementRef<HTMLDivElement>;
    @ViewChild('promptTextareaRef') private promptTextareaRef?: ElementRef<HTMLTextAreaElement>;

    // Constants
    readonly CONSTANTS = GEMINI_WORKSPACE_CONSTANTS;
    readonly AiActionType = AiActionType;
    readonly AiTone = AiTone;

    // Document State
    docId = signal<string>('');
    document = signal<Document | null>(null);
    documentText = signal<string>('');
    isLoading = signal<boolean>(true);
    accessDenied = signal<boolean>(false);
    fatalError = signal<string | null>(null);

    private ydoc: Y.Doc | null = null;
    private abortController: AbortController | null = null;
    private lastOperation: (() => void) | null = null;

    // Collaboration Status
    connectionStatus = this.collabService.status;
    role = this.collabService.role;
    canEdit = computed(() => this.collabService.canEdit());

    wordCount = computed(() => {
        const text = this.documentText().trim();
        return text ? text.split(/\s+/).filter(Boolean).length : 0;
    });

    // Chat State
    messages = signal<ChatMessage[]>([
        {
            id: 'ws-welcome',
            role: 'model',
            content:
                'Welcome to your dedicated **Gemini Workspace**! I have loaded your document context. ' +
                'Ask questions, request summaries, or use the **Tools** menu below to draft, rewrite, and polish.',
            timestamp: new Date(),
        },
    ]);

    promptControl = new FormControl('', { nonNullable: true });
    isStreaming = signal<boolean>(false);
    copiedMessageId = signal<string | null>(null);

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.abortCurrentStream();
            this.collabService.disconnect();
        });
    }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.fatalError.set('No document ID specified');
            this.isLoading.set(false);
            return;
        }

        this.docId.set(id);

        try {
            // 1. Fetch document metadata
            const doc = await this.docsService.getDocument(id);
            this.document.set(doc);

            // 2. Connect via Socket.IO/Yjs to load live document content
            this.ydoc = this.collabService.connect(id);
            const ytext = this.ydoc.getText('content');

            this.documentText.set(ytext.toString());

            ytext.observe(() => {
                this.documentText.set(ytext.toString());
            });

            this.isLoading.set(false);
        } catch (err: unknown) {
            this.isLoading.set(false);
            if (err instanceof HttpErrorResponse && err.status === 403) {
                this.accessDenied.set(true);
            } else {
                this.fatalError.set(
                    'Unable to load document or you do not have permission to access it.',
                );
            }
        }
    }

    // =========================================================
    // CONVERSATION EXECUTION
    // =========================================================

    onPromptKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.sendPrompt();
        }
    }

    onPromptInput(event: Event): void {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    }

    async sendPrompt(promptTextOverride?: string): Promise<void> {
        const text = promptTextOverride ?? this.promptControl.value.trim();
        if (!text || this.isStreaming()) return;

        if (!promptTextOverride) {
            this.promptControl.setValue('');
            if (this.promptTextareaRef) {
                this.promptTextareaRef.nativeElement.style.height = 'auto';
            }
        }

        const userMsgId = 'usr-' + Date.now();
        const modelMsgId = 'mod-' + Date.now();

        this.messages.update((msgs) => [
            ...msgs,
            {
                id: userMsgId,
                role: 'user',
                content: text,
                timestamp: new Date(),
            },
            {
                id: modelMsgId,
                role: 'model',
                content: '',
                timestamp: new Date(),
                isStreaming: true,
            },
        ]);

        this.scrollToBottom();

        const history = this.messages()
            .filter(
                (m) =>
                    m.id !== 'ws-welcome' && m.id !== modelMsgId && m.id !== userMsgId && !m.error,
            )
            .map((m) => ({ role: m.role, content: m.content }));

        const payload: AiChatPayload = {
            docId: this.docId(),
            message: text,
            history,
            documentContent: this.documentText(),
        };

        this.lastOperation = () => this.executeChatStream(payload, modelMsgId);
        await this.executeChatStream(payload, modelMsgId);
    }

    private async executeChatStream(payload: AiChatPayload, modelMsgId: string): Promise<void> {
        this.abortCurrentStream();
        this.abortController = new AbortController();
        this.isStreaming.set(true);

        let streamed = '';

        await this.aiService.streamChat(
            payload,
            {
                onChunk: (chunk: string) => {
                    streamed += chunk;
                    this.updateMessageContent(modelMsgId, streamed, true);
                    this.scrollToBottom();
                },
                onComplete: () => {
                    this.updateMessageContent(modelMsgId, streamed, false);
                    this.isStreaming.set(false);
                    this.abortController = null;
                },
                onError: (errorMsg: string) => {
                    this.updateMessageError(modelMsgId, errorMsg);
                    this.isStreaming.set(false);
                    this.abortController = null;
                    this.notifier.showError(errorMsg);
                },
            },
            this.abortController.signal,
        );
    }

    // =========================================================
    // COMPACT TOOLS MENU ACTIONS
    // =========================================================

    async runAction(
        action: AiActionType,
        opts?: { tone?: AiTone; targetLanguage?: string; prompt?: string },
    ): Promise<void> {
        if (this.isStreaming()) return;

        let label = action.toString().toLowerCase().replace('_', ' ');
        if (opts?.tone) label += ` (${opts.tone})`;
        if (opts?.targetLanguage) label += ` (${opts.targetLanguage})`;

        const userMsgId = 'act-usr-' + Date.now();
        const modelMsgId = 'act-mod-' + Date.now();

        this.messages.update((msgs) => [
            ...msgs,
            {
                id: userMsgId,
                role: 'user',
                content: `Run tool: **${label}**`,
                timestamp: new Date(),
            },
            {
                id: modelMsgId,
                role: 'model',
                content: '',
                timestamp: new Date(),
                action,
                isStreaming: true,
            },
        ]);

        this.scrollToBottom();

        const payload: AiActionPayload = {
            docId: this.docId(),
            action,
            prompt: opts?.prompt,
            documentContent: this.documentText(),
            tone: opts?.tone,
            targetLanguage: opts?.targetLanguage,
        };

        this.lastOperation = () => this.executeActionStream(payload, modelMsgId);
        await this.executeActionStream(payload, modelMsgId);
    }

    private async executeActionStream(payload: AiActionPayload, modelMsgId: string): Promise<void> {
        this.abortCurrentStream();
        this.abortController = new AbortController();
        this.isStreaming.set(true);

        let streamed = '';

        await this.aiService.streamAction(
            payload,
            {
                onChunk: (chunk: string) => {
                    streamed += chunk;
                    this.updateMessageContent(modelMsgId, streamed, true);
                    this.scrollToBottom();
                },
                onComplete: () => {
                    this.updateMessageContent(modelMsgId, streamed, false);
                    this.isStreaming.set(false);
                    this.abortController = null;
                },
                onError: (errorMsg: string) => {
                    this.updateMessageError(modelMsgId, errorMsg);
                    this.isStreaming.set(false);
                    this.abortController = null;
                    this.notifier.showError(errorMsg);
                },
            },
            this.abortController.signal,
        );
    }

    stopGeneration(): void {
        this.abortCurrentStream();
        this.isStreaming.set(false);
    }

    regenerateLast(): void {
        if (this.lastOperation) {
            this.lastOperation();
        }
    }

    // =========================================================
    // DOCUMENT INTEGRATION & CROSS-TAB SYNC
    // =========================================================

    insertIntoDocument(text: string): void {
        if (!text) return;
        if (!this.canEdit()) {
            this.notifier.showError('You have Viewer permission. Editing is disabled.');
            return;
        }

        this.aiDocSync.broadcast({
            type: 'INSERT',
            docId: this.docId(),
            text,
        });

        this.notifier.showSuccess('Content inserted into document');
    }

    replaceDocumentContent(text: string): void {
        if (!text) return;
        if (!this.canEdit()) {
            this.notifier.showError('You have Viewer permission. Editing is disabled.');
            return;
        }

        this.aiDocSync.broadcast({
            type: 'REPLACE',
            docId: this.docId(),
            text,
        });

        this.notifier.showSuccess('Document content replaced');
    }

    async copyToClipboard(id: string, text: string): Promise<void> {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            this.copiedMessageId.set(id);
            this.notifier.showSuccess('Copied to clipboard');
            setTimeout(() => {
                if (this.copiedMessageId() === id) {
                    this.copiedMessageId.set(null);
                }
            }, 2000);
        } catch {
            this.notifier.showError('Failed to copy to clipboard');
        }
    }

    // =========================================================
    // MARKDOWN & SCROLL
    // =========================================================

    formatMarkdown(text: string): string {
        return formatMarkdownForDisplay(text);
    }

    private updateMessageContent(id: string, content: string, isStreaming: boolean): void {
        this.messages.update((msgs) =>
            msgs.map((m) => (m.id === id ? { ...m, content, isStreaming } : m)),
        );
    }

    private updateMessageError(id: string, error: string): void {
        this.messages.update((msgs) =>
            msgs.map((m) =>
                m.id === id
                    ? {
                          ...m,
                          content: 'Failed to generate response. Please try again.',
                          isStreaming: false,
                          error,
                      }
                    : m,
            ),
        );
    }

    private abortCurrentStream(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            const el = this.messagesScrollArea?.nativeElement;
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        }, 30);
    }
}
