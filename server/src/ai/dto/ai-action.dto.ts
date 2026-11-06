import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { AI_CONSTANTS, AiActionType, AiSummaryFormat, AiTone } from '../ai.constants';

export class AiActionDto {
    @IsUUID('4')
    @IsNotEmpty()
    docId!: string;

    @IsEnum(AiActionType)
    @IsNotEmpty()
    action!: AiActionType;

    @IsOptional()
    @IsString()
    @MaxLength(AI_CONSTANTS.MAX_PROMPT_CHARS)
    prompt?: string;

    @IsOptional()
    @IsString()
    @MaxLength(AI_CONSTANTS.MAX_SELECTION_CHARS)
    selectedText?: string;

    @IsOptional()
    @IsString()
    @MaxLength(AI_CONSTANTS.MAX_DOCUMENT_CHARS)
    documentContent?: string;

    @IsOptional()
    @IsEnum(AiTone)
    tone?: AiTone;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    targetLanguage?: string;

    @IsOptional()
    @IsEnum(AiSummaryFormat)
    summaryFormat?: AiSummaryFormat;

    @IsOptional()
    @IsBoolean()
    stream?: boolean;
}
