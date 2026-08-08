import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsDefined } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsDefined({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsDefined({ message: 'Display name is required' })
    @IsString({ message: 'Display name must be a string' })
    @MinLength(2, { message: 'Display name must be at least 2 characters long' })
    @Matches(/^[^\s]+(\s+[^\s]+)*$/, {
        message: 'Display name cannot start or end with spaces, and cannot consist only of spaces',
    })
    displayName!: string;

    @IsDefined({ message: 'Password is required' })
    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password!: string;
}
