import { IsDefined, IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsDefined({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

    @IsDefined({ message: 'Password is required' })
    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    password!: string;
}
