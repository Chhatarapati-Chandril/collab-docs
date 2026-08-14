import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;
}
