import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
    @IsDefined({ message: 'Google ID token is required' })
    @IsNotEmpty()
    @IsString()
    idToken!: string;
}
