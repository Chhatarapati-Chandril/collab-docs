import { AiTone } from '../../core/models/ai.model';

export const AI_SIDEBAR_CONSTANTS = {
    title: 'Gemini',
    chatPlaceholder: 'Ask Gemini about this document or choose a tool...',
    tones: [
        AiTone.PROFESSIONAL,
        AiTone.CASUAL,
        AiTone.FORMAL,
        AiTone.FRIENDLY,
        AiTone.ACADEMIC,
        AiTone.PERSUASIVE,
        AiTone.CONCISE,
    ],
    languages: [
        'Spanish',
        'French',
        'German',
        'Italian',
        'Portuguese',
        'Hindi',
        'Japanese',
        'Chinese (Simplified)',
    ],
    welcomeMessage:
        'Hello! I am Gemini, your document assistant. Ask me questions, generate new content, or use the **Tools** menu below to summarize, rewrite, or polish your writing.',
};
