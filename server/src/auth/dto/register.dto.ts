import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsNotEmpty({ message: 'Display name is required' })
    @IsString()
    @MinLength(2, { message: 'Display name must be at least 2 characters long' })
    @Matches(/^[^\s]+(\s+[^\s]+)*$/, {
        message: 'Display name cannot start or end with spaces, and cannot consist only of spaces',
    })
    displayName!: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password!: string;
}
