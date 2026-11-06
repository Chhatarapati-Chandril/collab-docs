import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;

    @IsOptional()
    @IsString()
    coverImageUrl?: string;

    @IsOptional()
    @IsString()
    coverPublicId?: string;

    @IsOptional()
    @IsString()
    coverType?: string;
}
