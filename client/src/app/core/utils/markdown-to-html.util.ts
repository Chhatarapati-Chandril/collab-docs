/**
 * CollabDocs Markdown to Sanitized HTML Converter
 *
 * Converts Gemini AI Markdown responses into valid, sanitized HTML suitable for
 * Quill / TipTap rich text insertion and conversational message preview display.
 *
 * Supports:
 * - Escaped Markdown characters: \*\*, \###, \*, \_, \[, \], etc.
 * - HTML entities: &#x20;, &nbsp;, &quot;, &#39;, &amp;, &lt;, &gt;
 * - Headings 1, 2, 3 (#, ##, ###)
 * - Bold (**, __), Italic (*, _), Bold+Italic (***)
 * - Underline (<u>, explicit markup)
 * - Strikethrough (~~)
 * - Ordered lists (1. , 2. ) with nested indentation
 * - Unordered lists (-, *, +) with nested indentation
 * - Blockquotes (> )
 * - Fenced code blocks (```lang ... ```) and inline code (`code`)
 * - Links ([text](url)) with safe target and rel attributes
 * - Horizontal dividers (---, ***, ___)
 * - Strict HTML sanitization to prevent XSS while preserving formatting tags
 */

/** Set of permitted safe HTML tags */
const ALLOWED_TAGS = new Set([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'strike',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li',
    'a',
    'span',
    'div',
]);

/**
 * Normalizes escaped characters and entities produced by Gemini or user inputs.
 */
function unescapeMarkdownEntities(input: string): string {
    if (!input) return '';

    return (
        input
            // Normalize non-breaking spaces and entity spaces
            .replace(/&#x20;/gi, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            // Handle escaped headings at beginning of lines, e.g. \### or \## or \#
            .replace(/^(\s*)\\#{1,6}\s+/gm, (match) => match.replace('\\', ''))
            // Handle escaped bold/italic markers, e.g. \*\* or \__ or \* or \_
            .replace(/\\\*\\\*/g, '**')
            .replace(/\\_\\_/g, '__')
            .replace(/\\\*/g, '*')
            .replace(/\\_/g, '_')
            // Handle escaped links or brackets
            .replace(/\\\[/g, '[')
            .replace(/\\\]/g, ']')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
    );
}

/**
 * Escapes characters for safe inclusion inside pre/code blocks and raw text.
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Formats inline Markdown within a line or paragraph.
 */
function parseInlineMarkdown(text: string): string {
    if (!text) return '';

    let out = text;

    // 1. Inline code: `code`
    out = out.replace(/`([^`]+)`/g, (_match, code) => `<code>${escapeHtml(code)}</code>`);

    // 2. Bold + Italic: ***text***
    out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

    // 3. Bold: **text** or __text__
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 4. Italic: *text* or _text_
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

    // 5. Strikethrough: ~~text~~
    out = out.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // 6. Links: [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
        const cleanUrl = url.trim();
        // Allow only safe URL protocols
        if (/^(https?:\/\/|mailto:|\/)/i.test(cleanUrl)) {
            const safeHref = escapeHtml(cleanUrl);
            return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        }
        return label;
    });

    return out;
}

interface ListStackItem {
    type: 'ul' | 'ol';
    indent: number;
}

/**
 * Converts a Markdown string into valid HTML.
 */
export function markdownToHtml(markdown: string): string {
    if (!markdown || !markdown.trim()) return '';

    const normalized = unescapeMarkdownEntities(markdown);
    const lines = normalized.split(/\r?\n/);
    const htmlBlocks: string[] = [];

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];

    const listStack: ListStackItem[] = [];

    let blockquoteBuffer: string[] = [];

    const closeAllLists = () => {
        while (listStack.length > 0) {
            const top = listStack.pop();
            htmlBlocks.push(`</${top!.type}>`);
        }
    };

    const flushBlockquote = () => {
        if (blockquoteBuffer.length > 0) {
            const quoteContent = blockquoteBuffer
                .map((line) => parseInlineMarkdown(line))
                .join('<br>');
            htmlBlocks.push(`<blockquote><p>${quoteContent}</p></blockquote>`);
            blockquoteBuffer = [];
        }
    };

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();

        // 1. Fenced Code Block start/end
        if (trimmed.startsWith('```')) {
            if (inCodeBlock) {
                // End code block
                const safeCode = escapeHtml(codeBuffer.join('\n'));
                const classAttr = codeLanguage
                    ? ` class="language-${escapeHtml(codeLanguage)}"`
                    : '';
                htmlBlocks.push(`<pre><code${classAttr}>${safeCode}</code></pre>`);
                codeBuffer = [];
                inCodeBlock = false;
                codeLanguage = '';
            } else {
                // Close any open lists or blockquotes
                closeAllLists();
                flushBlockquote();
                inCodeBlock = true;
                codeLanguage = trimmed.slice(3).trim();
                codeBuffer = [];
            }
            continue;
        }

        if (inCodeBlock) {
            codeBuffer.push(rawLine);
            continue;
        }

        // 2. Blockquotes
        if (trimmed.startsWith('>')) {
            closeAllLists();
            const quoteText = trimmed.replace(/^>\s?/, '');
            blockquoteBuffer.push(quoteText);
            continue;
        } else {
            flushBlockquote();
        }

        // 3. Empty line: closes lists and adds separation
        if (!trimmed) {
            closeAllLists();
            continue;
        }

        // 4. Horizontal Rule: ---, ***, ___
        if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
            closeAllLists();
            htmlBlocks.push('<hr>');
            continue;
        }

        // 5. Headings: #, ##, ###, ####, #####, ######
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            closeAllLists();
            const level = Math.min(headingMatch[1].length, 3); // Map H1-H3 for editor compatibility
            const content = parseInlineMarkdown(headingMatch[2].trim());
            htmlBlocks.push(`<h${level}>${content}</h${level}>`);
            continue;
        }

        // 6. Lists (Ordered and Unordered, with indentation nesting)
        const unorderedMatch = rawLine.match(/^([ \t]*)[-*+](?:[ \t]+)(.*)$/);
        const orderedMatch = rawLine.match(/^([ \t]*)(\d+)[.)](?:[ \t]+)(.*)$/);

        if (unorderedMatch || orderedMatch) {
            const isOrdered = Boolean(orderedMatch);
            const match = isOrdered ? orderedMatch! : unorderedMatch!;
            const indentSpaces = match[1].replace(/\t/g, '    ').length;
            const content = parseInlineMarkdown(match[isOrdered ? 3 : 2].trim());
            const listType: 'ul' | 'ol' = isOrdered ? 'ol' : 'ul';

            // Calculate current stack depth
            const currentIndent =
                listStack.length > 0 ? listStack[listStack.length - 1].indent : -1;

            if (indentSpaces > currentIndent) {
                // Nested deeper
                listStack.push({ type: listType, indent: indentSpaces });
                htmlBlocks.push(`<${listType}>`);
            } else if (indentSpaces < currentIndent) {
                // Unindent to matching level
                while (
                    listStack.length > 0 &&
                    listStack[listStack.length - 1].indent > indentSpaces
                ) {
                    const top = listStack.pop();
                    htmlBlocks.push(`</${top!.type}>`);
                }
                if (
                    listStack.length === 0 ||
                    listStack[listStack.length - 1].indent !== indentSpaces
                ) {
                    listStack.push({ type: listType, indent: indentSpaces });
                    htmlBlocks.push(`<${listType}>`);
                }
            } else if (listStack.length === 0) {
                listStack.push({ type: listType, indent: indentSpaces });
                htmlBlocks.push(`<${listType}>`);
            } else if (listStack[listStack.length - 1].type !== listType) {
                // Type switch (ul -> ol or vice versa) at same level
                const top = listStack.pop();
                htmlBlocks.push(`</${top!.type}>`);
                listStack.push({ type: listType, indent: indentSpaces });
                htmlBlocks.push(`<${listType}>`);
            }

            htmlBlocks.push(`<li>${content}</li>`);
            continue;
        }

        // Not a list item
        closeAllLists();

        // 7. Standard Paragraph
        const content = parseInlineMarkdown(trimmed);
        htmlBlocks.push(`<p>${content}</p>`);
    }

    // Flush any pending blocks
    if (inCodeBlock && codeBuffer.length > 0) {
        const safeCode = escapeHtml(codeBuffer.join('\n'));
        htmlBlocks.push(`<pre><code>${safeCode}</code></pre>`);
    }
    closeAllLists();
    flushBlockquote();

    return htmlBlocks.join('');
}

/**
 * Strict DOM-based HTML Sanitizer.
 *
 * Strips any unsafe tags, attributes, event handlers, and javascript: URLs,
 * leaving only clean, safe, valid HTML elements supported by Quill and TipTap.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';

    // If running in browser environment, use DOMParser
    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const container = doc.body.firstElementChild || doc.body;

        cleanNode(container);

        return container.innerHTML;
    }

    // Fallback regex sanitizer if DOMParser is unavailable
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:[^"']*/gi, '');
}

function cleanNode(node: Node): void {
    const children = Array.from(node.childNodes);

    for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            const tagName = el.tagName.toLowerCase();

            if (!ALLOWED_TAGS.has(tagName)) {
                // Replace invalid element with its text content or remove
                const textNode = document.createTextNode(el.textContent || '');
                node.replaceChild(textNode, el);
                continue;
            }

            // Clean attributes
            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
                const attrName = attr.name.toLowerCase();

                if (attrName.startsWith('on')) {
                    el.removeAttribute(attr.name);
                    continue;
                }

                if (tagName === 'a') {
                    if (attrName === 'href') {
                        const val = attr.value.trim();
                        if (!/^(https?:\/\/|mailto:|\/)/i.test(val)) {
                            el.removeAttribute('href');
                        }
                    } else if (attrName !== 'target' && attrName !== 'rel') {
                        el.removeAttribute(attr.name);
                    }
                } else if (tagName === 'code' || tagName === 'pre') {
                    if (attrName !== 'class') {
                        el.removeAttribute(attr.name);
                    }
                } else if (tagName === 'li') {
                    if (attrName !== 'data-checked') {
                        el.removeAttribute(attr.name);
                    }
                } else {
                    // Disallow all other attributes on standard tags
                    el.removeAttribute(attr.name);
                }
            }

            cleanNode(el);
        }
    }
}

/**
 * Main conversion pipeline:
 * 1. Checks if input is already formatted HTML or raw Markdown
 * 2. Processes Markdown into rich semantic HTML
 * 3. Sanitizes the result strictly
 */
export function parseMarkdownToSanitizedHtml(input: string): string {
    if (!input || !input.trim()) return '';

    // If input already appears to be full HTML (contains balanced HTML tags), sanitize directly
    const isAlreadyHtml =
        /^<[a-z1-6]+[\s>]/i.test(input.trim()) && /<\/[a-z1-6]+>$/i.test(input.trim());

    const html = isAlreadyHtml ? input : markdownToHtml(input);
    return sanitizeHtml(html);
}

/**
 * Sanitizes raw AI error messages, extracting human-readable explanations
 * and ensuring raw internal JSON or stack traces never appear in the UI.
 */
export function sanitizeAiErrorMessage(rawMsg?: string | null): string {
    if (!rawMsg) {
        return 'Unable to generate response. Please try again.';
    }

    const trimmed = rawMsg.trim();

    // Check if message contains JSON payload (e.g. {"error": {"code": 503, ...}})
    if (trimmed.includes('{"error"') || (trimmed.includes('{') && trimmed.includes('"message"'))) {
        try {
            const jsonStart = trimmed.indexOf('{');
            const jsonEnd = trimmed.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
                    error?: { code?: number; message?: string; status?: string };
                    message?: string;
                };

                const innerMsg = parsed.error?.message || parsed.message;
                if (innerMsg) {
                    return sanitizeAiErrorMessage(innerMsg);
                }
            }
        } catch {
            // Not parseable JSON
        }
    }

    const lower = trimmed.toLowerCase();

    if (
        lower.includes('unavailable') ||
        lower.includes('503') ||
        lower.includes('high demand') ||
        lower.includes('overloaded') ||
        lower.includes('spikes in demand') ||
        lower.includes('temporarily unavailable')
    ) {
        return 'Gemini is currently experiencing high demand. Please try again in a few moments.';
    }

    if (
        lower.includes('429') ||
        lower.includes('quota') ||
        lower.includes('resource_exhausted') ||
        lower.includes('rate limit')
    ) {
        return 'Gemini AI rate limit reached. Please wait a moment before trying again.';
    }

    if (lower.includes('safety') || lower.includes('blocked') || lower.includes('policy')) {
        return 'This prompt or generated response was flagged by safety filters.';
    }

    if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('api key')) {
        return 'AI service authentication failed. Please check system configuration.';
    }

    // Strip internal debug prefixes if present
    const cleaned = trimmed
        .replace(/^AI generation encountered an error:\s*/i, '')
        .replace(/^Server returned \d+:\s*/i, '')
        .trim();

    if (cleaned.startsWith('got status:')) {
        return 'Gemini is temporarily unavailable. Please try again shortly.';
    }

    return cleaned || 'Failed to generate response. Please try again.';
}

/**
 * Helper for AI chat bubble and preview rendering so preview and inserted document
 * share 100% consistent styling and parsing.
 */
export function formatMarkdownForDisplay(text: string): string {
    return parseMarkdownToSanitizedHtml(text);
}
