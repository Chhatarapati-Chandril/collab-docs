export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthComponent {
    status: HealthStatus;
    latencyMs?: number;
    error?: string;
}

export interface HealthResponse {
    status: HealthStatus;
    service: string;
    timestamp: string;
    uptimeSeconds: number;
    version?: string;

    checks: {
        database: HealthComponent;
    };
}
