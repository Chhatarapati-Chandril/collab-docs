import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { HEALTH_CONSTANTS } from './health.constants';
import { HealthComponent, HealthResponse } from './health.types';

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);

    constructor(private readonly prisma: PrismaService) {}

    async check(): Promise<HealthResponse> {
        const startedAt = performance.now();

        const database = await this.checkDatabase();

        const response: HealthResponse = {
            status: database.status === 'ok' ? 'ok' : 'down',

            service: HEALTH_CONSTANTS.SERVICE_NAME,

            timestamp: new Date().toISOString(),

            uptimeSeconds: Math.floor(process.uptime()),

            checks: {
                database,
            },
        };

        const durationMs = Math.round(performance.now() - startedAt);

        this.logger.log(
            `Health check completed in ${durationMs}ms ` + `(database=${database.status})`,
        );

        if (response.status === 'down') {
            throw new ServiceUnavailableException(response);
        }

        return response;
    }

    private async checkDatabase(): Promise<HealthComponent> {
        const startedAt = performance.now();

        try {
            await this.prisma.$queryRaw`SELECT 1`;

            const latencyMs = Math.round(performance.now() - startedAt);

            return {
                status: 'ok',
                latencyMs,
            };
        } catch (error) {
            const latencyMs = Math.round(performance.now() - startedAt);

            this.logger.error(
                `Database health check failed after ${latencyMs}ms`,
                error instanceof Error ? error.stack : String(error),
            );

            return {
                status: 'down',
                latencyMs,
                error: 'Database unavailable',
            };
        }
    }
}
