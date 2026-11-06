import { AiTone } from '../../core/models/ai.model';

export const GEMINI_WORKSPACE_CONSTANTS = {
    title: 'Gemini Workspace',
    promptPlaceholder: 'Ask Gemini anything about this document, or choose a tool from the menu...',
    suggestedStarters: [
        {
            title: 'Summarize Document',
            prompt: 'Please provide a clear, structured summary of this document with key takeaways.',
            icon: 'summarize',
        },
        {
            title: 'Improve & Polish',
            prompt: 'Review the text and improve vocabulary, flow, and sentence variety while preserving meaning.',
            icon: 'diamond',
        },
        {
            title: 'Check Grammar & Spelling',
            prompt: 'Proofread this document and correct all grammar, spelling, punctuation, and typos.',
            icon: 'spellcheck',
        },
        {
            title: 'Continue Writing',
            prompt: 'Continue writing naturally from where the document leaves off, matching the existing style.',
            icon: 'fast_forward',
        },
    ],
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
};
