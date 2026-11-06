import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;

    @IsOptional()
    @IsString()
    coverImageUrl?: string | null;

    @IsOptional()
    @IsString()
    coverPublicId?: string | null;

    @IsOptional()
    @IsString()
    coverType?: string | null;
}
