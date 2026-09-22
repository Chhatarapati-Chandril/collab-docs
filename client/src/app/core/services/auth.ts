import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, map, Observable, tap, switchMap } from 'rxjs';
import {
    ApiResponse,
    LoginResponse,
    RefreshResponse,
    RegisterResponse,
} from '../models/api-response.model';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

interface LoginPayload {
    email: string;
    password: string;
}
interface RegisterPayload {
    email: string;
    displayName: string;
    password: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/auth`;

    private accessTokenSig = signal<string | null>(null);
    private userSig = signal<User | null>(null);

    readonly user = this.userSig.asReadonly();
    readonly isAuthenticated = computed(() => this.accessTokenSig() !== null);

    get accessToken(): string | null {
        return this.accessTokenSig();
    }

    async login(payload: LoginPayload): Promise<void> {
        const res = await firstValueFrom(
            this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/login`, payload, {
                withCredentials: true, // required so the refreshToken cookie gets set
            }),
        );
        this.accessTokenSig.set(res.data.accessToken);
        this.userSig.set(res.data.user);
    }

    async register(payload: RegisterPayload): Promise<void> {
        await firstValueFrom(
            this.http.post<ApiResponse<RegisterResponse>>(`${this.baseUrl}/register`, payload, {
                withCredentials: true,
            }),
        );
    }

    async logout(): Promise<void> {
        await firstValueFrom(
            this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }),
        );
        this.accessTokenSig.set(null);
        this.userSig.set(null);
    }

    async fetchProfile(): Promise<User> {
        const res = await firstValueFrom(
            this.http.get<ApiResponse<User>>(`${environment.apiUrl}/users/me`),
        );
        this.userSig.set(res.data);
        return res.data;
    }

    refreshAccessToken$(): Observable<string> {
        return this.http
            .post<ApiResponse<RefreshResponse>>(
                `${this.baseUrl}/refresh`,
                {},
                { withCredentials: true },
            )
            .pipe(
                tap((res) => this.accessTokenSig.set(res.data.accessToken)),
                switchMap((res) =>
                    this.http.get<ApiResponse<User>>(`${environment.apiUrl}/users/me`).pipe(
                        tap((profileRes) => this.userSig.set(profileRes.data)),
                        map(() => res.data.accessToken),
                    ),
                ),
            );
    }

    clearSession(): void {
        this.accessTokenSig.set(null);
        this.userSig.set(null);
    }
}
