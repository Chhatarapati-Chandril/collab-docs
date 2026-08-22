import { IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsOptional()
    @IsString({ message: 'Display name must be a string' })
    @MinLength(2, { message: 'Display name must be at least 2 characters long' })
    @Matches(/^[^\s]+(\s+[^\s]+)*$/, {
        message: 'Display name cannot start or end with spaces, and cannot consist only of spaces',
    })
    displayName?: string;
}
