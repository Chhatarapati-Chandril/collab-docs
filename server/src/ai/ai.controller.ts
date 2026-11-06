import { Body, Controller, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { ApiResponse } from '../common/dto/api-response.dto';
import { Serialize } from '../common/intercepters/serialize.interceptor';
import { AI_CONSTANTS, AiActionType } from './ai.constants';
import { AiService } from './ai.service';
import { AiActionDto } from './dto/ai-action.dto';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiResponseDto } from './dto/ai-response.dto';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: AI_CONSTANTS.RATE_LIMIT_MAX, ttl: AI_CONSTANTS.RATE_LIMIT_TTL } })
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    // =========================================================
    // STREAMING ENDPOINTS (SSE)
    // =========================================================

    @Post('action/stream')
    async streamAction(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
        @Res() res: Response,
    ): Promise<void> {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        try {
            const stream = this.aiService.streamAction(user.userId, dto);
            for await (const chunk of stream) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }
            res.write('data: [DONE]\n\n');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        } finally {
            res.end();
        }
    }

    @Post('chat/stream')
    async streamChat(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiChatDto,
        @Res() res: Response,
    ): Promise<void> {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        try {
            const stream = this.aiService.streamChat(user.userId, dto);
            for await (const chunk of stream) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }
            res.write('data: [DONE]\n\n');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        } finally {
            res.end();
        }
    }

    // =========================================================
    // STANDARD REST ENDPOINTS
    // =========================================================

    @Post('action')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async executeAction(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'AI action completed successfully',
            data: result,
        });
    }

    @Post('chat')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async executeChat(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiChatDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        const result = await this.aiService.executeChat(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'AI chat response generated',
            data: result,
        });
    }

    // Dedicated action endpoints
    @Post('generate')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async generate(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.GENERATE;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Content generated successfully',
            data: result,
        });
    }

    @Post('continue')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async continueWriting(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.CONTINUE;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Continuation generated successfully',
            data: result,
        });
    }

    @Post('summarize')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async summarize(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.SUMMARIZE;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Summary generated successfully',
            data: result,
        });
    }

    @Post('rewrite')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async rewrite(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.REWRITE;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Text rewritten successfully',
            data: result,
        });
    }

    @Post('improve')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async improve(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.IMPROVE;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Writing improved successfully',
            data: result,
        });
    }

    @Post('grammar')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async fixGrammar(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.FIX_GRAMMAR;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Grammar and spelling checked',
            data: result,
        });
    }

    @Post('expand')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async expand(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.EXPAND;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Content expanded successfully',
            data: result,
        });
    }

    @Post('shorten')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async shorten(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.SHORTEN;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Content shortened successfully',
            data: result,
        });
    }

    @Post('tone')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async changeTone(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.CHANGE_TONE;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Tone changed successfully',
            data: result,
        });
    }

    @Post('translate')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async translate(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.TRANSLATE;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Text translated successfully',
            data: result,
        });
    }

    @Post('explain')
    @HttpCode(HttpStatus.OK)
    @Serialize(AiResponseDto)
    async explain(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: AiActionDto,
    ): Promise<ApiResponse<AiResponseDto>> {
        dto.action = AiActionType.EXPLAIN;
        const result = await this.aiService.executeAction(user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Explanation generated successfully',
            data: result,
        });
    }
}
