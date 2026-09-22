import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { Permission, Document } from '../models/doc.model';
import { environment } from '../../../environments/environment';

export interface ShareEmailPayload {
    docId: string;
    email: string;
    permission: Permission;
}

export interface SetPublicAccessPayload {
    publicAccess: Permission | null;
}

export interface ResolveAccessRequestPayload {
    action: 'APPROVE' | 'DENY';
    grantedPermission: Permission;
}

export interface DocPermissionUser {
    id: string;
    permission: Permission;
    user: {
        id: string;
        displayName: string;
        email: string;
    };
}

@Injectable({ providedIn: 'root' })
export class Share {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/share`;

    async getDocumentUsers(docId: string): Promise<DocPermissionUser[]> {
        const res = await firstValueFrom(
            this.http.get<ApiResponse<DocPermissionUser[]>>(`${this.baseUrl}/${docId}/users`),
        );
        return res.data;
    }

    async shareViaEmail(payload: ShareEmailPayload): Promise<void> {
        await firstValueFrom(
            this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/email`, payload),
        );
    }

    async updatePublicAccess(docId: string, payload: SetPublicAccessPayload): Promise<Document> {
        const res = await firstValueFrom(
            this.http.patch<ApiResponse<Document>>(
                `${this.baseUrl}/${docId}/public-access`,
                payload,
            ),
        );
        return res.data;
    }

    async removePermission(docId: string, userId: string): Promise<void> {
        await firstValueFrom(
            this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${docId}/users/${userId}`),
        );
    }

    async resolveAccessRequest(
        notificationId: string,
        payload: ResolveAccessRequestPayload,
    ): Promise<void> {
        await firstValueFrom(
            this.http.patch<ApiResponse<unknown>>(
                `${this.baseUrl}/resolve-request/${notificationId}`,
                payload,
            ),
        );
    }

    async requestAccess(docId: string, permission: Permission = 'EDITOR'): Promise<void> {
        await firstValueFrom(
            this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/request-access`, {
                docId,
                permission,
            }),
        );
    }
}
