import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor(private configService: ConfigService) {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is missing!');
        }

        const pool = new Pool({ connectionString: databaseUrl });
        const adapter = new PrismaPg(pool);

        super({
            adapter,
            log: ['warn', 'error'],
        });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
        this.logger.log('Database connected');
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
        this.logger.log('Database disconnected');
    }
}
