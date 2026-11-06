import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCoverDto {
    @IsNotEmpty()
    @IsString()
    coverImageUrl!: string;

    @IsOptional()
    @IsString()
    coverPublicId?: string;

    @IsOptional()
    @IsString()
    coverType?: string;
}
