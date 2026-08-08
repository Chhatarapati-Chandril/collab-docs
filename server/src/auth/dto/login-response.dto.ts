import { UserWithoutPassword } from '../types/user-without-password.type';

export class LoginResponseDto {
    accessToken!: string;
    user!: UserWithoutPassword;
}
