import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { Permission, Document } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MyLoggerService } from '../my-logger/my-logger.service';
import { AI_CONSTANTS } from './ai.constants';
import { AiActionDto } from './dto/ai-action.dto';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiResponseDto } from './dto/ai-response.dto';
import { buildActionPrompt, buildChatPrompt } from './ai.prompts';

interface ResolvedDocContext {
    document: Document;
    role: Permission;
}

@Injectable()
export class AiService {
    private client: GoogleGenAI | null = null;
    private primaryModel: string;
    private fallbackModel: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly logger: MyLoggerService,
    ) {
        this.logger.setContext(AiService.name);
        this.primaryModel =
            this.configService.get<string>('GEMINI_MODEL') || AI_CONSTANTS.DEFAULT_MODEL;
        this.fallbackModel = AI_CONSTANTS.FALLBACK_MODEL;

        this.initClient();
    }

    private initClient(): void {
        const apiKey =
            this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            this.logger.warn(
                'GEMINI_API_KEY is not set. AI operations will return Service Unavailable until a key is configured.',
            );
            this.client = null;
            return;
        }

        try {
            this.client = new GoogleGenAI({ apiKey });
            this.logger.log(`Initialized Gemini AI SDK using model: ${this.primaryModel}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to initialize GoogleGenAI client: ${message}`);
            this.client = null;
        }
    }

    private getClient(): GoogleGenAI {
        if (!this.client) {
            this.initClient();
            if (!this.client) {
                throw new ServiceUnavailableException(
                    'Gemini AI service is currently unavailable. Please verify GEMINI_API_KEY is configured in the server environment.',
                );
            }
        }
        return this.client;
    }

    async verifyDocumentAccess(userId: string, docId: string): Promise<ResolvedDocContext> {
        const doc = await this.prisma.document.findUnique({
            where: { id: docId },
            include: {
                permissions: {
                    where: { userId },
                },
            },
        });

        if (!doc) {
            throw new NotFoundException('Document not found');
        }

        let role: Permission | null = null;

        if (doc.ownerId === userId) {
            role = Permission.OWNER;
        } else if (doc.permissions.length > 0) {
            role = doc.permissions[0].permission;
        } else if (doc.publicAccess) {
            role = doc.publicAccess;
        }

        if (!role) {
            throw new ForbiddenException(
                'You do not have permission to access this document or run AI operations on it.',
            );
        }

        return { document: doc, role };
    }

    async executeAction(userId: string, dto: AiActionDto): Promise<AiResponseDto> {
        const { document } = await this.verifyDocumentAccess(userId, dto.docId);
        const promptConfig = buildActionPrompt(document, dto);
        const client = this.getClient();

        try {
            const response = await client.models.generateContent({
                model: this.primaryModel,
                contents: promptConfig.contents,
                config: {
                    systemInstruction: promptConfig.systemInstruction,
                    temperature: promptConfig.temperature,
                },
            });

            return {
                text: response.text || '',
                action: dto.action,
                model: this.primaryModel,
            };
        } catch (err: unknown) {
            return this.handleApiError(err, 'executeAction', async () => {
                const fallbackResponse = await client.models.generateContent({
                    model: this.fallbackModel,
                    contents: promptConfig.contents,
                    config: {
                        systemInstruction: promptConfig.systemInstruction,
                        temperature: promptConfig.temperature,
                    },
                });
                return {
                    text: fallbackResponse.text || '',
                    action: dto.action,
                    model: this.fallbackModel,
                };
            });
        }
    }

    async executeChat(userId: string, dto: AiChatDto): Promise<AiResponseDto> {
        const { document } = await this.verifyDocumentAccess(userId, dto.docId);
        const promptConfig = buildChatPrompt(document, dto);
        const client = this.getClient();

        try {
            const response = await client.models.generateContent({
                model: this.primaryModel,
                contents: promptConfig.contents,
                config: {
                    systemInstruction: promptConfig.systemInstruction,
                    temperature: promptConfig.temperature,
                },
            });

            return {
                text: response.text || '',
                action: 'CHAT',
                model: this.primaryModel,
            };
        } catch (err: unknown) {
            return this.handleApiError(err, 'executeChat', async () => {
                const fallbackResponse = await client.models.generateContent({
                    model: this.fallbackModel,
                    contents: promptConfig.contents,
                    config: {
                        systemInstruction: promptConfig.systemInstruction,
                        temperature: promptConfig.temperature,
                    },
                });
                return {
                    text: fallbackResponse.text || '',
                    action: 'CHAT',
                    model: this.fallbackModel,
                };
            });
        }
    }

    async *streamAction(userId: string, dto: AiActionDto): AsyncGenerator<string> {
        const { document } = await this.verifyDocumentAccess(userId, dto.docId);
        const promptConfig = buildActionPrompt(document, dto);
        const client = this.getClient();

        try {
            const stream = await client.models.generateContentStream({
                model: this.primaryModel,
                contents: promptConfig.contents,
                config: {
                    systemInstruction: promptConfig.systemInstruction,
                    temperature: promptConfig.temperature,
                },
            });

            for await (const chunk of stream) {
                if (chunk.text) {
                    yield chunk.text;
                }
            }
        } catch (err: unknown) {
            this.logger.error(
                `Error in streamAction: ${err instanceof Error ? err.message : String(err)}`,
            );
            this.handleStreamError(err);
        }
    }

    async *streamChat(userId: string, dto: AiChatDto): AsyncGenerator<string> {
        const { document } = await this.verifyDocumentAccess(userId, dto.docId);
        const promptConfig = buildChatPrompt(document, dto);
        const client = this.getClient();

        try {
            const stream = await client.models.generateContentStream({
                model: this.primaryModel,
                contents: promptConfig.contents,
                config: {
                    systemInstruction: promptConfig.systemInstruction,
                    temperature: promptConfig.temperature,
                },
            });

            for await (const chunk of stream) {
                if (chunk.text) {
                    yield chunk.text;
                }
            }
        } catch (err: unknown) {
            this.logger.error(
                `Error in streamChat: ${err instanceof Error ? err.message : String(err)}`,
            );
            this.handleStreamError(err);
        }
    }

    private handleStreamError(err: unknown): never {
        const msg = err instanceof Error ? err.message : String(err);
        if (
            msg.includes('429') ||
            msg.toLowerCase().includes('quota') ||
            msg.includes('RESOURCE_EXHAUSTED')
        ) {
            throw new HttpException(
                'Gemini AI quota or rate limit exceeded. Please wait a moment before trying again.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
        if (msg.toLowerCase().includes('safety') || msg.toLowerCase().includes('blocked')) {
            throw new BadRequestException(
                'Request or output was blocked by Gemini AI safety filters.',
            );
        }
        if (msg.includes('401') || msg.toLowerCase().includes('api key')) {
            throw new UnauthorizedException('Invalid or unauthorized Gemini API key.');
        }
        throw new InternalServerErrorException(`AI generation encountered an error: ${msg}`);
    }

    private async handleApiError<T>(
        err: unknown,
        context: string,
        retryFallback?: () => Promise<T>,
    ): Promise<T> {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Gemini API error during ${context}: ${message}`);

        if (
            retryFallback &&
            !message.includes('429') &&
            !message.toLowerCase().includes('quota') &&
            !message.toLowerCase().includes('safety')
        ) {
            try {
                this.logger.warn(
                    `Attempting fallback model ${this.fallbackModel} for ${context}...`,
                );
                return await retryFallback();
            } catch (fallbackErr: unknown) {
                this.logger.error(
                    `Fallback model also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
                );
            }
        }

        this.handleStreamError(err);
    }
}
