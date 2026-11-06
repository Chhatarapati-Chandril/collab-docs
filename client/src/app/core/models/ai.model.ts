export enum AiActionType {
    CHAT = 'CHAT',
    GENERATE = 'GENERATE',
    CONTINUE = 'CONTINUE',
    SUMMARIZE = 'SUMMARIZE',
    REWRITE = 'REWRITE',
    IMPROVE = 'IMPROVE',
    FIX_GRAMMAR = 'FIX_GRAMMAR',
    EXPAND = 'EXPAND',
    SHORTEN = 'SHORTEN',
    CHANGE_TONE = 'CHANGE_TONE',
    TRANSLATE = 'TRANSLATE',
    EXPLAIN = 'EXPLAIN',
}

export enum AiTone {
    PROFESSIONAL = 'Professional',
    CASUAL = 'Casual',
    FORMAL = 'Formal',
    FRIENDLY = 'Friendly',
    ACADEMIC = 'Academic',
    PERSUASIVE = 'Persuasive',
    CONCISE = 'Concise',
}

export enum AiSummaryFormat {
    PARAGRAPH = 'Paragraph',
    BULLET_POINTS = 'Bullet points',
    EXECUTIVE = 'Executive summary',
    KEY_TAKEAWAYS = 'Key takeaways',
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
    action?: AiActionType;
    isStreaming?: boolean;
    error?: string;
}

export interface AiActionPayload {
    docId: string;
    action: AiActionType;
    prompt?: string;
    selectedText?: string;
    documentContent?: string;
    tone?: AiTone;
    targetLanguage?: string;
    summaryFormat?: AiSummaryFormat;
}

export interface AiChatPayload {
    docId: string;
    message: string;
    history?: { role: 'user' | 'model'; content: string }[];
    selectedText?: string;
    documentContent?: string;
}

export interface AiResponse {
    text: string;
    action: string;
    model: string;
    finishReason?: string;
}
