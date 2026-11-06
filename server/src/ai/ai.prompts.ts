import { Document } from '@prisma/client';
import { Content } from '@google/genai';
import { AI_CONSTANTS, AiActionType, AiSummaryFormat, AiTone } from './ai.constants';
import { AiActionDto } from './dto/ai-action.dto';
import { AiChatDto } from './dto/ai-chat.dto';

export interface GeminiPromptConfig {
    systemInstruction: string;
    contents: string | Content[];
    temperature: number;
}

export function buildActionPrompt(doc: Document, dto: AiActionDto): GeminiPromptConfig {
    const { action, prompt, selectedText, documentContent, tone, targetLanguage, summaryFormat } =
        dto;
    const title = doc.title || 'Untitled Document';

    let systemInstruction = '';
    let userContent = '';
    let temperature = 0.7;

    switch (action) {
        case AiActionType.GENERATE:
            systemInstruction =
                'You are an expert document co-writer in CollabDocs. ' +
                'Draft clear, high-quality, professional document content following the user prompt. ' +
                'Return ONLY the document content directly. ' +
                'Do NOT include conversational introductory or concluding phrases (e.g. "Sure, here is...", "Hope this helps!").';
            userContent =
                `Document Title: "${title}"\n` +
                (documentContent
                    ? `Existing document context:\n"""\n${documentContent.slice(0, 3000)}\n"""\n\n`
                    : '') +
                `User instruction: ${prompt || 'Generate content'}`;
            temperature = 0.8;
            break;

        case AiActionType.CONTINUE:
            systemInstruction =
                'You are an expert document writing collaborator. ' +
                'Your job is to seamlessly continue writing from where the text ends. ' +
                'Match the tone, vocabulary, formatting, and perspective of the existing text. ' +
                'Do NOT repeat or echo what has already been written. ' +
                'Return ONLY the continuation text directly.';
            userContent =
                `Document Title: "${title}"\n\n` +
                `Text so far:\n"""\n${(selectedText || documentContent || '').slice(-4000)}\n"""\n\n` +
                'Continue writing naturally from the end of the text above:';
            temperature = 0.7;
            break;

        case AiActionType.SUMMARIZE: {
            const format = summaryFormat || AiSummaryFormat.BULLET_POINTS;
            systemInstruction =
                `You are an executive summarization assistant. ` +
                `Provide a comprehensive, high-clarity summary of the provided text in "${format}" format. ` +
                `Highlight the most important ideas, key takeaways, and conclusions.`;
            const textToSummarize = selectedText || documentContent || '';
            userContent =
                `Document Title: "${title}"\n\n` +
                `Content to summarize:\n"""\n${textToSummarize.slice(0, AI_CONSTANTS.MAX_DOCUMENT_CHARS)}\n"""`;
            temperature = 0.4;
            break;
        }

        case AiActionType.REWRITE:
            systemInstruction =
                'You are a professional editor. Rewrite the selected text to enhance flow, rhythm, and clarity ' +
                'while strictly retaining the original meaning and core ideas. ' +
                'Return ONLY the rewritten text without commentary, quotes, or conversational preamble.';
            userContent =
                `Selected text to rewrite:\n"""\n${selectedText || documentContent || ''}\n"""` +
                (prompt ? `\n\nAdditional style guidance: ${prompt}` : '');
            temperature = 0.7;
            break;

        case AiActionType.IMPROVE:
            systemInstruction =
                'You are a master copyeditor. Elevate the quality of the selected text: ' +
                'enhance vocabulary, improve sentence structure, eliminate awkward phrasing, and polish clarity ' +
                "while preserving the author's original message and voice. " +
                'Return ONLY the improved text without explanation or commentary.';
            userContent = `Selected text to improve:\n"""\n${selectedText || documentContent || ''}\n"""`;
            temperature = 0.5;
            break;

        case AiActionType.FIX_GRAMMAR:
            systemInstruction =
                'You are a meticulous proofreader. Fix all spelling mistakes, grammatical errors, ' +
                'punctuation faults, and typos in the text. Do NOT change words unnecessarily if they are grammatically correct. ' +
                'Return ONLY the corrected text without any notes or explanations.';
            userContent = `Text to correct:\n"""\n${selectedText || documentContent || ''}\n"""`;
            temperature = 0.2;
            break;

        case AiActionType.EXPAND:
            systemInstruction =
                'You are a skilled writing assistant. Expand upon the selected text by adding meaningful details, ' +
                "illustrative examples, contextual nuance, or deeper explanations, while maintaining the author's tone and perspective. " +
                'Return ONLY the expanded text directly without commentary.';
            userContent =
                `Text to expand:\n"""\n${selectedText || documentContent || ''}\n"""` +
                (prompt ? `\n\nFocus on: ${prompt}` : '');
            temperature = 0.7;
            break;

        case AiActionType.SHORTEN:
            systemInstruction =
                'You are an editor specializing in concise communication. Condense the selected text, ' +
                'removing redundancies, fluff, and unnecessary filler words while keeping all essential points and substance intact. ' +
                'Return ONLY the shortened text directly without commentary.';
            userContent = `Text to shorten:\n"""\n${selectedText || documentContent || ''}\n"""`;
            temperature = 0.4;
            break;

        case AiActionType.CHANGE_TONE: {
            const targetTone = tone || AiTone.PROFESSIONAL;
            systemInstruction =
                `You are a stylistic writing expert. Rephrase the selected text so that its tone is distinctly "${targetTone}". ` +
                `Adjust phrasing, word choice, and cadence accordingly. ` +
                `Return ONLY the rephrased text with the new tone without commentary.`;
            userContent = `Text to adapt to ${targetTone} tone:\n"""\n${selectedText || documentContent || ''}\n"""`;
            temperature = 0.6;
            break;
        }

        case AiActionType.TRANSLATE: {
            const lang = targetLanguage || 'English';
            systemInstruction =
                `You are a professional document translator. Translate the provided text accurately and idiomatically into "${lang}". ` +
                `Preserve formatting and line breaks where appropriate. ` +
                `Return ONLY the translated text without commentary.`;
            userContent = `Text to translate into ${lang}:\n"""\n${selectedText || documentContent || ''}\n"""`;
            temperature = 0.3;
            break;
        }

        case AiActionType.EXPLAIN:
            systemInstruction =
                'You are an expert tutor and researcher. Explain the selected text clearly and concisely. ' +
                'Break down complex terminology, provide context, and explain implications in an easy-to-understand manner. ' +
                'Use bullet points or structured paragraphs where helpful.';
            userContent =
                `Document Title: "${title}"\n\n` +
                `Selected text to explain:\n"""\n${selectedText || documentContent || ''}\n"""` +
                (prompt ? `\n\nSpecific question: ${prompt}` : '');
            temperature = 0.5;
            break;

        default:
            systemInstruction =
                'You are an intelligent assistant in CollabDocs. Help the user with their document.';
            userContent = prompt || 'Hello';
    }

    return { systemInstruction, contents: userContent, temperature };
}

export function buildChatPrompt(doc: Document, dto: AiChatDto): GeminiPromptConfig {
    const { message, history, selectedText, documentContent } = dto;
    const title = doc.title || 'Untitled Document';

    const systemInstruction =
        'You are Gemini, the collaborative AI assistant integrated directly into CollabDocs. ' +
        'You help users brainstorm, analyze, write, structure, research, and refine their documents. ' +
        'You are fully document-aware. Answer concisely, helpfully, and use markdown where formatting improves readability. ' +
        'When the user asks you to write or revise sections, provide clear text that can be used directly in their document.';

    let contextPreamble = `[DOCUMENT CONTEXT]\nTitle: "${title}"\n`;

    if (selectedText) {
        contextPreamble += `Currently selected text in editor:\n"""\n${selectedText.slice(0, AI_CONSTANTS.MAX_SELECTION_CHARS)}\n"""\n\n`;
    }

    if (documentContent) {
        contextPreamble += `Full document text:\n"""\n${documentContent.slice(0, 30_000)}\n"""\n\n`;
    }

    contextPreamble += `[END DOCUMENT CONTEXT]\n\n`;

    const contents: Content[] = [];

    if (history && history.length > 0) {
        for (let i = 0; i < history.length; i++) {
            const item = history[i];
            if (i === 0 && item.role === 'user') {
                contents.push({
                    role: 'user',
                    parts: [{ text: contextPreamble + item.content }],
                });
            } else {
                contents.push({
                    role: item.role === 'model' ? 'model' : 'user',
                    parts: [{ text: item.content }],
                });
            }
        }

        contents.push({
            role: 'user',
            parts: [{ text: message }],
        });
    } else {
        contents.push({
            role: 'user',
            parts: [{ text: contextPreamble + `User question or instruction: ${message}` }],
        });
    }

    return {
        systemInstruction,
        contents,
        temperature: 0.7,
    };
}
