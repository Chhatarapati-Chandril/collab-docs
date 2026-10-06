import { Controller, Get, Logger } from '@nestjs/common';

import { HealthService } from './health.service';
import { HealthResponse } from './health.types';

@Controller('health')
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(private readonly healthService: HealthService) {}

    @Get()
    async check(): Promise<HealthResponse> {
        const startedAt = performance.now();

        const response = await this.healthService.check();

        const durationMs = Math.round(performance.now() - startedAt);

        this.logger.log(`GET /health completed in ${durationMs}ms`);

        return response;
    }
}
