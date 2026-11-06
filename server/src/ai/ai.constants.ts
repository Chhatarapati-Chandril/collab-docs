export const AI_CONSTANTS = {
    DEFAULT_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    FALLBACK_MODEL: 'gemini-3.5-flash-lite',
    RATE_LIMIT_TTL: 60_000,
    RATE_LIMIT_MAX: 30, // 30 AI requests per minute per user
    MAX_DOCUMENT_CHARS: 100_000,
    MAX_PROMPT_CHARS: 10_000,
    MAX_SELECTION_CHARS: 30_000,
};

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
