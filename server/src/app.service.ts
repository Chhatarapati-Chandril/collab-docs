import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getApplicationInfo() {
        return {
            name: 'CollabDocs API',
            version: process.env.APP_VERSION ?? '1.0.0',
            environment: process.env.NODE_ENV ?? 'development',
        };
    }
}
