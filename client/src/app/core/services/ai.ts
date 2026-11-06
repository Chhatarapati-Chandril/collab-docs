import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AiActionPayload, AiChatPayload, AiResponse } from '../models/ai.model';
import { Auth } from './auth';

export interface StreamCallbacks {
    onChunk: (chunk: string) => void;
    onComplete: () => void;
    onError: (errorMessage: string) => void;
}

@Injectable({ providedIn: 'root' })
export class Ai {
    private http = inject(HttpClient);
    private authService = inject(Auth);
    private baseUrl = `${environment.apiUrl}/ai`;

    async executeAction(payload: AiActionPayload): Promise<AiResponse> {
        const res = await firstValueFrom(
            this.http.post<ApiResponse<AiResponse>>(`${this.baseUrl}/action`, payload),
        );
        return res.data;
    }

    async executeChat(payload: AiChatPayload): Promise<AiResponse> {
        const res = await firstValueFrom(
            this.http.post<ApiResponse<AiResponse>>(`${this.baseUrl}/chat`, payload),
        );
        return res.data;
    }

    async streamAction(
        payload: AiActionPayload,
        callbacks: StreamCallbacks,
        signal?: AbortSignal,
    ): Promise<void> {
        await this.readEventStream(`${this.baseUrl}/action/stream`, payload, callbacks, signal);
    }

    async streamChat(
        payload: AiChatPayload,
        callbacks: StreamCallbacks,
        signal?: AbortSignal,
    ): Promise<void> {
        await this.readEventStream(`${this.baseUrl}/chat/stream`, payload, callbacks, signal);
    }

    private async readEventStream(
        url: string,
        body: unknown,
        callbacks: StreamCallbacks,
        signal?: AbortSignal,
    ): Promise<void> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
        };

        const token = this.authService.accessToken;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal,
                credentials: 'include',
            });

            if (!response.ok) {
                let errorMsg = `Server returned ${response.status}: ${response.statusText}`;
                try {
                    const errorJson = await response.json();
                    if (errorJson.message) {
                        errorMsg = errorJson.message;
                    }
                } catch {
                    // response is not json
                }
                callbacks.onError(errorMsg);
                return;
            }

            if (!response.body) {
                callbacks.onError('ReadableStream not supported or empty body');
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        callbacks.onComplete();
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() ?? '';

                    for (const part of parts) {
                        const trimmed = part.trim();
                        if (!trimmed) continue;

                        const lines = trimmed.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6).trim();

                                if (dataStr === '[DONE]') {
                                    callbacks.onComplete();
                                    return;
                                }

                                try {
                                    const parsed = JSON.parse(dataStr);
                                    if (parsed.error) {
                                        callbacks.onError(parsed.error);
                                        return;
                                    }
                                    if (parsed.text) {
                                        callbacks.onChunk(parsed.text);
                                    }
                                } catch {
                                    // In case text is plain string
                                    callbacks.onChunk(dataStr);
                                }
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } catch (err: unknown) {
            if (signal?.aborted) {
                // Aborted by user - complete cleanly
                callbacks.onComplete();
                return;
            }
            const message = err instanceof Error ? err.message : String(err);
            callbacks.onError(message);
        }
    }
}
