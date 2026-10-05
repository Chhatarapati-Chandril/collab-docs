import { Controller, Get, Logger } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(private readonly healthService: HealthService) {}

    @Get()
    async check() {
        const start = Date.now();
        const result = await this.healthService.check();
        this.logger.log(`GET /health responded in ${Date.now() - start}ms`);
        return result;
    }
}
