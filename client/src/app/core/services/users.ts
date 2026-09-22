import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

export interface UpdateProfilePayload {
    displayName: string;
}

@Injectable({ providedIn: 'root' })
export class Users {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/users`;

    async updateProfile(payload: UpdateProfilePayload): Promise<User> {
        const res = await firstValueFrom(
            this.http.patch<ApiResponse<User>>(`${this.baseUrl}/me`, payload),
        );
        return res.data;
    }

    async searchUsers(email: string): Promise<User[]> {
        const res = await firstValueFrom(
            this.http.get<ApiResponse<User[]>>(`${this.baseUrl}/search`, {
                params: { email },
            }),
        );
        return res.data;
    }
}
