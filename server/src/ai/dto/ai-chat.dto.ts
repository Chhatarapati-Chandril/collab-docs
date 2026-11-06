import {
    IsArray,
    IsBoolean,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AI_CONSTANTS } from '../ai.constants';

export class ChatMessageDto {
    @IsString()
    @IsIn(['user', 'model'])
    role!: 'user' | 'model';

    @IsString()
    @MaxLength(AI_CONSTANTS.MAX_PROMPT_CHARS)
    content!: string;
}

export class AiChatDto {
    @IsUUID('4')
    @IsNotEmpty()
    docId!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(AI_CONSTANTS.MAX_PROMPT_CHARS)
    message!: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    history?: ChatMessageDto[];

    @IsOptional()
    @IsString()
    @MaxLength(AI_CONSTANTS.MAX_SELECTION_CHARS)
    selectedText?: string;

    @IsOptional()
    @IsString()
    @MaxLength(AI_CONSTANTS.MAX_DOCUMENT_CHARS)
    documentContent?: string;

    @IsOptional()
    @IsBoolean()
    stream?: boolean;
}
