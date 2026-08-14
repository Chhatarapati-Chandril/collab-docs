import { IsString, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
    @IsString()
    @MaxLength(255)
    title!: string;
}
