import { User } from './user.model';

export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T;
}

export interface LoginResponse {
    accessToken: string;
    user: User;
}

export interface RegisterResponse {
    user: User;
}

export interface RefreshResponse {
    accessToken: string;
}
