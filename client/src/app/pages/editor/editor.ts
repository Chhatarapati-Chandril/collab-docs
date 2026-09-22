import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
    computed,
    inject,
    signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { QuillEditorComponent, QuillModules } from 'ngx-quill';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import { QuillBinding } from 'y-quill';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Docs } from '../../core/services/docs';
import { Collab } from '../../core/services/collab';
import { Share } from '../../core/services/share';
import { Document, Permission } from '../../core/models/doc.model';
import { appLogger } from '../../core/utils/app-logger.util';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { Notifier } from '../../shared/services/notifier';
import { EDITOR_CONSTANTS } from './editor.constants';
import { PresenceBar } from '../../shared/presence-bar/presence-bar';
import { OfflineIndicator } from '../../shared/offline-indicator/offline-indicator';

Quill.register('modules/cursors', QuillCursors);

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatIconModule,
        MatButtonModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatFormFieldModule,
        QuillEditorComponent,
        RouterLink,
        PresenceBar,
        OfflineIndicator,
    ],
    templateUrl: './editor.html',
    styleUrl: './editor.scss',
})
export class Editor implements OnInit, OnDestroy {
    @ViewChild('titleInput') private titleInputRef?: ElementRef<HTMLInputElement>;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private docsService = inject(Docs);
    private collabService = inject(Collab);

    private docId!: string;
    private binding: QuillBinding | null = null;

    document = signal<Document | null>(null);
    isLoading = signal(true);
    fatalError = signal<string | null>(null);
    isEditingTitle = signal(false);

    readonly EDITOR_CONSTANTS = EDITOR_CONSTANTS;

    titleControl = new FormControl('', { nonNullable: true });

    connectionStatus = this.collabService.status;
    role = this.collabService.role;
    canEdit = computed(() => this.collabService.canEdit());

    TOOLBAR_TOOLTIPS: Record<string, string> = {
        font: 'Font',
        size: 'Font size',
        bold: 'Bold (Ctrl+B)',
        italic: 'Italic (Ctrl+I)',
        underline: 'Underline (Ctrl+U)',
        strike: 'Strikethrough',
        color: 'Text color',
        background: 'Highlight color',
        script: 'Script',
        header: 'Heading',
        list: 'List',
        indent: 'Indent',
        align: 'Align',
        blockquote: 'Blockquote',
        'code-block': 'Code block',
        link: 'Insert link',
        video: 'Insert video',
        clean: 'Clear formatting',
    };

    // value-specific overrides, keyed by "format:value"
    TOOLBAR_VALUE_TOOLTIPS: Record<string, string> = {
        'list:ordered': 'Numbered list',
        'list:bullet': 'Bulleted list',
        'list:check': 'Checklist',
        'indent:-1': 'Decrease indent',
        'indent:+1': 'Increase indent',
        'script:sub': 'Subscript',
        'script:super': 'Superscript',
        'header:1': 'Heading 1',
        'header:2': 'Heading 2',
        'header:3': 'Heading 3',
        'header:false': 'Normal text',
    };

    private setToolbarTooltips(toolbarEl: HTMLElement): void {
        const controls = toolbarEl.querySelectorAll<HTMLElement>(
            'button, .ql-picker-item, .ql-picker-label',
        );

        controls.forEach((el) => {
            const formatClass = [...el.classList].find(
                (c) => c.startsWith('ql-') && c !== 'ql-active' && c !== 'ql-picker-label',
            );
            if (!formatClass) return;

            const format = formatClass.replace('ql-', '');
            const value = el.getAttribute('value');
            const key = value !== null ? `${format}:${value}` : format;

            const tooltip = this.TOOLBAR_VALUE_TOOLTIPS[key] ?? this.TOOLBAR_TOOLTIPS[format];
            if (tooltip) el.setAttribute('title', tooltip);
        });
    }

    quillModules: QuillModules = {
        cursors: true,

        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ script: 'sub' }, { script: 'super' }],
            [{ header: [1, 2, 3, false] }],
            [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
            [{ indent: '-1' }, { indent: '+1' }],
            [{ align: [] }],
            ['blockquote', 'code-block'],
            ['link', 'video'],
            ['clean'],
        ],
    };

    startTitleEdit(): void {
        if (this.role() !== 'OWNER') return;
        this.titleControl.setValue(this.document()?.title ?? '');
        this.isEditingTitle.set(true);
        setTimeout(() => this.titleInputRef?.nativeElement.focus());
    }

    async commitTitleEdit(): Promise<void> {
        if (!this.isEditingTitle()) return; // guard: blur fires after Enter — skip if already committed
        this.isEditingTitle.set(false);
        const newTitle = this.titleControl.value.trim();
        const currentTitle = this.document()?.title ?? '';
        if (newTitle && newTitle !== currentTitle) {
            try {
                const updated = await this.docsService.updateDocument(this.docId, {
                    title: newTitle,
                });
                this.document.set(updated);
            } catch {
                appLogger.error(EDITOR_CONSTANTS.renameErrorLog);
            }
        }
    }

    cancelTitleEdit(): void {
        this.isEditingTitle.set(false);
    }

    // Access Denied / Fatal Error state
    readonly accessDeniedDocId = signal<string | null>(null);
    readonly isRequestingAccess = signal(false);
    readonly accessRequestSent = signal(false);
    readonly requestedPermission = signal<Permission>('EDITOR');

    // PDF Export
    readonly isDownloadingPdf = signal(false);

    private shareService = inject(Share);
    private notifier = inject(Notifier);

    async downloadPdf(): Promise<void> {
        // Target ONLY the content area (.ql-editor), bypassing the toolbar entirely
        const editorEl = document.querySelector('.ql-editor') as HTMLElement;
        if (!editorEl) {
            this.notifier.showError(EDITOR_CONSTANTS.pdfError);
            return;
        }

        this.isDownloadingPdf.set(true);

        try {
            // Ensure jsPDF can find html2canvas
            (window as unknown as { html2canvas: unknown }).html2canvas = html2canvas;

            const doc = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4',
            });

            const rawTitle = this.document()?.title || EDITOR_CONSTANTS.defaultPdfFilename;
            const safeTitle = rawTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

            const margins = EDITOR_CONSTANTS.pdfMarginPt;
            const contentWidth = 595.28 - margins[1] - margins[3];

            await doc.html(editorEl, {
                callback: (pdf) => {
                    pdf.save(`${safeTitle}.pdf`);
                    this.notifier.showSuccess(EDITOR_CONSTANTS.pdfSuccess);
                },
                margin: margins as unknown as number[], // Ensure type compatibility
                x: 0,
                y: 0,
                width: contentWidth,
                windowWidth: 687, // Maintains 0.75 ratio (515.28 / 687) so 16px renders as 12pt
                autoPaging: 'text',
                html2canvas: {
                    scale: 1, // Fixed scale to prevent retina/high-DPI zoom bugs in jsPDF
                    useCORS: true,
                    logging: false,
                    onclone: (clonedDoc) => {
                        // html2canvas clones the DOM into an iframe natively, preventing visible flashes.
                        // Strip UI padding from the clone so we don't double up on PDF margins.
                        const clonedEditor = clonedDoc.querySelector('.ql-editor') as HTMLElement;
                        if (clonedEditor) {
                            clonedEditor.style.padding = '0';
                            clonedEditor.style.height = 'auto';
                            clonedEditor.style.overflow = 'visible';
                        }
                    },
                },
            });
        } catch (err) {
            appLogger.error(`PDF export failed: ${err}`);
            this.notifier.showError(EDITOR_CONSTANTS.pdfError);
        } finally {
            this.isDownloadingPdf.set(false);
        }
    }

    async requestAccess(): Promise<void> {
        const id = this.accessDeniedDocId();
        if (!id) return;

        this.isRequestingAccess.set(true);
        try {
            await this.shareService.requestAccess(id, this.requestedPermission());
            this.accessRequestSent.set(true);
            this.notifier.showSuccess(EDITOR_CONSTANTS.requestAccessSuccess);
        } catch (err) {
            this.notifier.showError(extractErrorMessage(err, EDITOR_CONSTANTS.requestAccessError));
        } finally {
            this.isRequestingAccess.set(false);
        }
    }

    async ngOnInit(): Promise<void> {
        this.docId = this.route.snapshot.paramMap.get('id')!;

        try {
            const doc = await this.docsService.getDocument(this.docId);
            this.document.set(doc);
        } catch (err: unknown) {
            if ((err as HttpErrorResponse).status === 403) {
                this.accessDeniedDocId.set(this.docId);
            } else {
                this.fatalError.set('Document not found or an unexpected error occurred.');
            }
            this.isLoading.set(false);
            return;
        }

        this.isLoading.set(false);
    }

    onEditorCreated(quill: Quill): void {
        const toolbarModule = quill.getModule('toolbar') as { container: HTMLElement };
        this.setToolbarTooltips(toolbarModule.container);

        const ydoc = this.collabService.connect(this.docId);
        const ytext = ydoc.getText('content');
        const awareness = this.collabService.getAwareness();

        if (!awareness) {
            appLogger.error('Awareness not initialized — cursors will not sync');
            return;
        }

        this.binding = new QuillBinding(ytext, quill, awareness);
    }

    ngOnDestroy(): void {
        this.binding?.destroy();
        this.collabService.disconnect();
    }
}
