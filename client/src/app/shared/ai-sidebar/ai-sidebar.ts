import {
    Component,
    DestroyRef,
    ElementRef,
    ViewChild,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    AiActionPayload,
    AiActionType,
    AiChatPayload,
    AiTone,
    ChatMessage,
} from '../../core/models/ai.model';
import { Ai } from '../../core/services/ai';
import { Notifier } from '../services/notifier';
import { AI_SIDEBAR_CONSTANTS } from './ai-sidebar.constants';
import { formatMarkdownForDisplay } from '../../core/utils/markdown-to-html.util';

@Component({
    selector: 'app-ai-sidebar',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatProgressBarModule,
        MatTooltipModule,
    ],
    templateUrl: './ai-sidebar.html',
    styleUrl: './ai-sidebar.scss',
})
export class AiSidebar {
    private aiService = inject(Ai);
    private notifier = inject(Notifier);
    private destroyRef = inject(DestroyRef);

    @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('chatTextareaRef') private chatTextareaRef?: ElementRef<HTMLTextAreaElement>;

    // Inputs
    documentId = input.required<string>();
    documentTitle = input<string>('Untitled Document');
    canEdit = input<boolean>(true);
    selectedText = input<string>('');
    documentContent = input<string>('');

    // Outputs
    closeSidebar = output<void>();
    insertContent = output<string>();
    replaceSelection = output<string>();
    openWorkspace = output<void>();

    // Window States
    isMinimized = signal(false);
    isMaximized = signal(false);
    position = signal<{ x: number; y: number }>({ x: 0, y: 0 });

    private isDragging = false;
    private dragStart = { mouseX: 0, mouseY: 0, posX: 0, posY: 0 };

    // Constants
    readonly CONSTANTS = AI_SIDEBAR_CONSTANTS;
    readonly AiActionType = AiActionType;
    readonly AiTone = AiTone;

    // Chat State
    chatInput = new FormControl('', { nonNullable: true });
    isStreaming = signal(false);
    copiedMessageId = signal<string | null>(null);

    messages = signal<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'model',
            content: AI_SIDEBAR_CONSTANTS.welcomeMessage,
            timestamp: new Date(),
        },
    ]);

    private abortController: AbortController | null = null;
    private lastOperation: (() => void) | null = null;

    hasSelection = computed(() => Boolean(this.selectedText()?.trim()));

    selectedSnippet = computed(() => {
        const text = this.selectedText().trim();
        return text.length > 25 ? text.slice(0, 25) + '...' : text;
    });

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.abortCurrentStream();
        });
    }

    onChatKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.sendChatMessage();
        }
    }

    // =========================================================
    // WINDOW CONTROLS & DRAGGING
    // =========================================================

    onHeaderPointerDown(event: PointerEvent): void {
        if (this.isMaximized()) return;
        const target = event.target as HTMLElement;
        if (
            target.closest('button') ||
            target.closest('mat-icon-button') ||
            target.closest('input')
        ) {
            return;
        }

        const headerEl = event.currentTarget as HTMLElement;
        try {
            headerEl.setPointerCapture(event.pointerId);
        } catch {
            // Pointer capture may fail on unsupported devices or pointer types
        }

        this.isDragging = true;
        this.dragStart = {
            mouseX: event.clientX,
            mouseY: event.clientY,
            posX: this.position().x,
            posY: this.position().y,
        };

        const onPointerMove = (moveEvent: PointerEvent) => {
            if (!this.isDragging) return;
            const dx = moveEvent.clientX - this.dragStart.mouseX;
            const dy = moveEvent.clientY - this.dragStart.mouseY;

            this.position.set({
                x: this.dragStart.posX + dx,
                y: this.dragStart.posY + dy,
            });
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            this.isDragging = false;
            try {
                headerEl.releasePointerCapture(upEvent.pointerId);
            } catch {
                // Pointer capture release is best-effort
            }
            headerEl.removeEventListener('pointermove', onPointerMove);
            headerEl.removeEventListener('pointerup', onPointerUp);
            headerEl.removeEventListener('pointercancel', onPointerUp);
        };

        headerEl.addEventListener('pointermove', onPointerMove);
        headerEl.addEventListener('pointerup', onPointerUp);
        headerEl.addEventListener('pointercancel', onPointerUp);
    }

    onHeaderMouseDown(event: MouseEvent): void {
        if (event instanceof PointerEvent) {
            this.onHeaderPointerDown(event);
        }
    }

    toggleMinimize(): void {
        this.isMinimized.update((v) => !v);
    }

    toggleMaximize(): void {
        this.isMaximized.update((v) => !v);
        if (this.isMaximized()) {
            this.position.set({ x: 0, y: 0 });
        }
    }

    openWorkspaceInNewTab(): void {
        this.openWorkspace.emit();
    }

    // =========================================================
    // CHAT EXECUTION
    // =========================================================

    onChatInput(event: Event): void {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }

    async sendChatMessage(): Promise<void> {
        const message = this.chatInput.value.trim();
        if (!message || this.isStreaming()) return;

        this.chatInput.setValue('');
        if (this.chatTextareaRef) {
            this.chatTextareaRef.nativeElement.style.height = 'auto';
        }

        const userMsgId = 'usr-' + Date.now();
        const modelMsgId = 'mod-' + Date.now();

        this.messages.update((msgs) => [
            ...msgs,
            {
                id: userMsgId,
                role: 'user',
                content: message,
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
                (m) => m.id !== 'welcome' && m.id !== modelMsgId && m.id !== userMsgId && !m.error,
            )
            .map((m) => ({ role: m.role, content: m.content }));

        const payload: AiChatPayload = {
            docId: this.documentId(),
            message,
            history,
            selectedText: this.selectedText() || undefined,
            documentContent: this.documentContent() || undefined,
        };

        this.lastOperation = () => this.executeChatStream(payload, modelMsgId);
        await this.executeChatStream(payload, modelMsgId);
    }

    private async executeChatStream(payload: AiChatPayload, modelMsgId: string): Promise<void> {
        this.abortCurrentStream();
        this.abortController = new AbortController();
        this.isStreaming.set(true);

        let streamedText = '';

        await this.aiService.streamChat(
            payload,
            {
                onChunk: (chunk: string) => {
                    streamedText += chunk;
                    this.updateMessageContent(modelMsgId, streamedText, true);
                    this.scrollToBottom();
                },
                onComplete: () => {
                    this.updateMessageContent(modelMsgId, streamedText, false);
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
    // QUICK ACTIONS & TOOLS
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
                content:
                    `Apply **${label}**` +
                    (this.hasSelection() ? ` on: "${this.selectedSnippet()}"` : ''),
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
            docId: this.documentId(),
            action,
            prompt: opts?.prompt,
            selectedText: this.selectedText() || undefined,
            documentContent: this.documentContent() || undefined,
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

        let streamedText = '';

        await this.aiService.streamAction(
            payload,
            {
                onChunk: (chunk: string) => {
                    streamedText += chunk;
                    this.updateMessageContent(modelMsgId, streamedText, true);
                    this.scrollToBottom();
                },
                onComplete: () => {
                    this.updateMessageContent(modelMsgId, streamedText, false);
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
    // INSERTION / REPLACEMENT / CLIPBOARD
    // =========================================================

    onInsert(text: string): void {
        if (!text || !this.canEdit()) return;
        this.insertContent.emit(text);
        this.notifier.showSuccess('Content inserted into document');
    }

    onReplace(text: string): void {
        if (!text || !this.canEdit()) return;
        this.replaceSelection.emit(text);
        this.notifier.showSuccess('Selected text replaced');
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
    // FORMATTING & HELPERS
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
                          content: '',
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
            const el = this.messagesContainer?.nativeElement;
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        }, 30);
    }
}
