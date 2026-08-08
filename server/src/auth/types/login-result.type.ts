import { UserWithoutPassword } from './user-without-password.type';

export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    user: UserWithoutPassword;
}
