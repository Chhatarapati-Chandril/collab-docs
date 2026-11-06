import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { Document, GetDocumentsResponse } from '../models/doc.model';
import { environment } from '../../../environments/environment';

export interface CreateDocumentPayload {
    title?: string;
    coverImageUrl?: string | null;
    coverPublicId?: string | null;
    coverType?: string | null;
}

export interface UpdateDocumentPayload {
    title?: string;
    coverImageUrl?: string | null;
    coverPublicId?: string | null;
    coverType?: string | null;
}

export interface CoverUploadResponse {
    url: string;
    secureUrl: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
}

@Injectable({ providedIn: 'root' })
export class Docs {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/docs`;

    async getDocuments(): Promise<GetDocumentsResponse> {
        const res = await firstValueFrom(
            this.http.get<ApiResponse<GetDocumentsResponse>>(this.baseUrl),
        );
        return res.data;
    }

    async getDocument(id: string): Promise<Document> {
        const res = await firstValueFrom(
            this.http.get<ApiResponse<Document>>(`${this.baseUrl}/${id}`),
        );
        return res.data;
    }

    async createDocument(payload: CreateDocumentPayload = {}): Promise<Document> {
        const res = await firstValueFrom(
            this.http.post<ApiResponse<Document>>(this.baseUrl, payload),
        );
        return res.data;
    }

    async updateDocument(id: string, payload: UpdateDocumentPayload): Promise<Document> {
        const res = await firstValueFrom(
            this.http.patch<ApiResponse<Document>>(`${this.baseUrl}/${id}`, payload),
        );
        return res.data;
    }

    async setCover(
        id: string,
        payload: {
            coverImageUrl: string;
            coverPublicId?: string | null;
            coverType?: string | null;
        },
    ): Promise<Document> {
        const res = await firstValueFrom(
            this.http.patch<ApiResponse<Document>>(`${this.baseUrl}/${id}/cover`, payload),
        );
        return res.data;
    }

    async removeCover(id: string): Promise<Document> {
        const res = await firstValueFrom(
            this.http.delete<ApiResponse<Document>>(`${this.baseUrl}/${id}/cover`),
        );
        return res.data;
    }

    async uploadCoverImage(file: File): Promise<CoverUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await firstValueFrom(
            this.http.post<ApiResponse<CoverUploadResponse>>(
                `${this.baseUrl}/cover/upload`,
                formData,
            ),
        );
        return res.data;
    }

    async deleteDocument(id: string): Promise<void> {
        await firstValueFrom(this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`));
    }

    async copyDocument(id: string): Promise<Document> {
        const res = await firstValueFrom(
            this.http.post<ApiResponse<Document>>(`${this.baseUrl}/${id}/copy`, {}),
        );
        return res.data;
    }
}
