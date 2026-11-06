import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
    BehaviorSubject,
    catchError,
    firstValueFrom,
    filter,
    Observable,
    switchMap,
    take,
    tap,
    throwError,
} from 'rxjs';
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

/**
 * HttpContext token that tells the auth interceptor to skip the automatic
 * token-refresh retry for a specific request.
 *
 * Used internally by refreshAccessToken$() when it fetches /users/me so
 * that interceptor doesn't attempt a second refresh on that call.
 */
export const SKIP_AUTH_RETRY = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class Auth {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/auth`;

    private accessTokenSig = signal<string | null>(null);
    private userSig = signal<User | null>(null);

    readonly user = this.userSig.asReadonly();
    readonly isAuthenticated = computed(() => this.accessTokenSig() !== null);

    // -----------------------------------------------------------------------
    // Refresh-token deduplication
    // -----------------------------------------------------------------------
    // Prevents multiple concurrent 401 responses from each triggering their
    // own refresh call. While a refresh is in-flight every new caller simply
    // waits on the shared BehaviorSubject and receives the new token when it
    // arrives. This avoids refresh-token rotation race conditions entirely.
    private isRefreshing = false;
    private refreshSubject$ = new BehaviorSubject<string | null>(null);

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

    async googleLogin(idToken: string): Promise<void> {
        const res = await firstValueFrom(
            this.http.post<ApiResponse<LoginResponse>>(
                `${this.baseUrl}/google`,
                { idToken },
                { withCredentials: true },
            ),
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
        this.clearSession();

        if (typeof google !== 'undefined' && google?.accounts?.id) {
            google.accounts.id.disableAutoSelect();
        }
    }

    async fetchProfile(): Promise<User> {
        const res = await firstValueFrom(
            this.http.get<ApiResponse<User>>(`${environment.apiUrl}/users/me`),
        );
        this.userSig.set(res.data);
        return res.data;
    }

    /**
     * Refreshes the access token using the HTTP-only refresh-token cookie.
     *
     * Design decisions:
     *  - Only one refresh HTTP call is in-flight at a time (deduplication via
     *    BehaviorSubject). Any concurrent caller waits for the shared result.
     *  - The /users/me call that follows is tagged with SKIP_AUTH_RETRY so the
     *    interceptor never tries to trigger a second refresh for it, preventing
     *    an infinite refresh loop.
     */
    refreshAccessToken$(): Observable<string> {
        if (this.isRefreshing) {
            // Another refresh is already in-flight — subscribe to its result.
            return this.refreshSubject$.pipe(
                filter((token): token is string => token !== null),
                take(1),
            );
        }

        this.isRefreshing = true;
        this.refreshSubject$.next(null); // reset so late subscribers wait

        // Context flag that tells authInterceptor not to retry /users/me.
        const skipRetryContext = new HttpContext().set(SKIP_AUTH_RETRY, true);

        return this.http
            .post<ApiResponse<RefreshResponse>>(
                `${this.baseUrl}/refresh`,
                {},
                { withCredentials: true },
            )
            .pipe(
                tap((res) => {
                    // Publish the new token *before* the profile fetch so that
                    // any queued callers can proceed immediately.
                    this.accessTokenSig.set(res.data.accessToken);
                    this.refreshSubject$.next(res.data.accessToken);
                    this.isRefreshing = false;
                }),
                switchMap(() =>
                    // Fetch the profile with the skip-retry flag so the
                    // interceptor never re-enters refreshAccessToken$() for this.
                    this.http
                        .get<ApiResponse<User>>(`${environment.apiUrl}/users/me`, {
                            context: skipRetryContext,
                        })
                        .pipe(
                            tap((profileRes) => this.userSig.set(profileRes.data)),
                            // Return the new access token to callers.
                            switchMap(() =>
                                this.refreshSubject$.pipe(
                                    filter((token): token is string => token !== null),
                                    take(1),
                                ),
                            ),
                        ),
                ),
                catchError((err) => {
                    // Ensure the refresh lock is always released on failure so
                    // future calls are not permanently blocked.
                    this.isRefreshing = false;
                    this.refreshSubject$.next(null);
                    return throwError(() => err);
                }),
            );
    }

    clearSession(): void {
        this.isRefreshing = false;
        this.refreshSubject$.next(null);
        this.accessTokenSig.set(null);
        this.userSig.set(null);
    }
}
