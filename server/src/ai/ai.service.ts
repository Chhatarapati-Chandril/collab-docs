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

        let hasYielded = false;
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
                    hasYielded = true;
                    yield chunk.text;
                }
            }
        } catch (err: unknown) {
            this.logger.warn(
                `Primary model (${this.primaryModel}) streamAction error: ${err instanceof Error ? err.message : String(err)}`,
            );

            // If no chunks yielded yet and error is recoverable, attempt fallback model
            if (!hasYielded && this.canFallback(err)) {
                try {
                    this.logger.log(
                        `Attempting streamAction fallback model: ${this.fallbackModel}`,
                    );
                    const fallbackStream = await client.models.generateContentStream({
                        model: this.fallbackModel,
                        contents: promptConfig.contents,
                        config: {
                            systemInstruction: promptConfig.systemInstruction,
                            temperature: promptConfig.temperature,
                        },
                    });

                    for await (const chunk of fallbackStream) {
                        if (chunk.text) {
                            yield chunk.text;
                        }
                    }
                    return;
                } catch (fallbackErr: unknown) {
                    this.logger.error(
                        `Fallback model (${this.fallbackModel}) streamAction failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
                    );
                    this.handleStreamError(fallbackErr);
                }
            }

            this.handleStreamError(err);
        }
    }

    async *streamChat(userId: string, dto: AiChatDto): AsyncGenerator<string> {
        const { document } = await this.verifyDocumentAccess(userId, dto.docId);
        const promptConfig = buildChatPrompt(document, dto);
        const client = this.getClient();

        let hasYielded = false;
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
                    hasYielded = true;
                    yield chunk.text;
                }
            }
        } catch (err: unknown) {
            this.logger.warn(
                `Primary model (${this.primaryModel}) streamChat error: ${err instanceof Error ? err.message : String(err)}`,
            );

            // If no chunks yielded yet and error is recoverable, attempt fallback model
            if (!hasYielded && this.canFallback(err)) {
                try {
                    this.logger.log(`Attempting streamChat fallback model: ${this.fallbackModel}`);
                    const fallbackStream = await client.models.generateContentStream({
                        model: this.fallbackModel,
                        contents: promptConfig.contents,
                        config: {
                            systemInstruction: promptConfig.systemInstruction,
                            temperature: promptConfig.temperature,
                        },
                    });

                    for await (const chunk of fallbackStream) {
                        if (chunk.text) {
                            yield chunk.text;
                        }
                    }
                    return;
                } catch (fallbackErr: unknown) {
                    this.logger.error(
                        `Fallback model (${this.fallbackModel}) streamChat failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
                    );
                    this.handleStreamError(fallbackErr);
                }
            }

            this.handleStreamError(err);
        }
    }

    private canFallback(err: unknown): boolean {
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        if (
            msg.includes('safety') ||
            msg.includes('blocked') ||
            msg.includes('429') ||
            msg.includes('quota') ||
            msg.includes('resource_exhausted') ||
            msg.includes('401') ||
            msg.includes('api key')
        ) {
            return false;
        }
        return true;
    }

    private handleStreamError(err: unknown): never {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`AI execution error: ${msg}`);

        if (
            msg.includes('503') ||
            msg.includes('UNAVAILABLE') ||
            msg.toLowerCase().includes('high demand') ||
            msg.toLowerCase().includes('overloaded') ||
            msg.toLowerCase().includes('temporarily unavailable')
        ) {
            throw new HttpException(
                'Gemini is currently experiencing high demand. Please try again in a few moments.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
        if (
            msg.includes('429') ||
            msg.toLowerCase().includes('quota') ||
            msg.includes('RESOURCE_EXHAUSTED')
        ) {
            throw new HttpException(
                'Gemini AI rate limit exceeded. Please wait a moment before trying again.',
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
        if (msg.includes('404') || msg.includes('NOT_FOUND')) {
            throw new HttpException(
                'The requested AI model is currently unavailable.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
        throw new InternalServerErrorException(
            'Failed to generate AI response. Please try again later.',
        );
    }

    private async handleApiError<T>(
        err: unknown,
        context: string,
        retryFallback?: () => Promise<T>,
    ): Promise<T> {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Gemini API error during ${context}: ${message}`);

        if (retryFallback && this.canFallback(err)) {
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
