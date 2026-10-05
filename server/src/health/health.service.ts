import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);

    constructor(private readonly prisma: PrismaService) {}

    async check(): Promise<{
        status: string;
        timestamp: string;
        db: { status: string; latencyMs: number };
        uptime: number;
    }> {
        const timestamp = new Date().toISOString();
        const uptime = Math.floor(process.uptime());

        const dbStart = Date.now();
        try {
            // Cheapest possible read-only round-trip — touches no application tables,
            // does not modify any data, and reliably exercises the connection pool.
            await this.prisma.$queryRaw`SELECT 1`;
            const dbLatencyMs = Date.now() - dbStart;

            this.logger.log(
                `Health check passed — db latency: ${dbLatencyMs}ms, uptime: ${uptime}s`,
            );

            return {
                status: 'ok',
                timestamp,
                db: { status: 'ok', latencyMs: dbLatencyMs },
                uptime,
            };
        } catch (error: unknown) {
            const dbLatencyMs = Date.now() - dbStart;
            const message = error instanceof Error ? error.message : String(error);

            this.logger.error(
                `Health check FAILED — db unreachable after ${dbLatencyMs}ms: ${message}`,
            );

            // 503 so curl -sf and monitoring tools treat this as a real failure
            throw new ServiceUnavailableException({
                status: 'error',
                timestamp,
                db: { status: 'error', latencyMs: dbLatencyMs, error: message },
                uptime,
            });
        }
    }
}
