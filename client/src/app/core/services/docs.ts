import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { Document, GetDocumentsResponse } from '../models/doc.model';
import { environment } from '../../../environments/environment';

interface CreateDocumentPayload {
    title?: string;
}
interface UpdateDocumentPayload {
    title: string;
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
