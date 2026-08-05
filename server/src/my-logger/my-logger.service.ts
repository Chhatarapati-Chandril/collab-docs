import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class MyLoggerService implements LoggerService {
    private readonly logger: winston.Logger;

    constructor() {
        const isDev = process.env.NODE_ENV !== 'production';

        this.logger = winston.createLogger({
            level: isDev ? 'debug' : 'warn',
            transports: [
                // Console — always on, colorized in dev
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp({ format: 'HH:mm:ss' }),
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, context }) => {
                            const ts = timestamp as string;
                            const ctx = context as string | undefined;
                            const msg = message as string;
                            return `[${ts}] ${level} ${ctx ? `[${ctx}]` : ''} ${msg}`;
                        }),
                    ),
                }),

                // General log file — rotates daily, keeps 14 days
                new winston.transports.DailyRotateFile({
                    filename: 'logs/app-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxFiles: '14d',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),

                // Error-only log file — rotates daily, keeps 30 days
                new winston.transports.DailyRotateFile({
                    filename: 'logs/error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    level: 'error',
                    maxFiles: '30d',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),
            ],
        });
    }

    log(message: any, context?: string) {
        this.logger.info(message as string, { context });
    }

    error(message: any, trace?: string, context?: string) {
        this.logger.error(message as string, { trace, context });
    }

    warn(message: any, context?: string) {
        this.logger.warn(message as string, { context });
    }

    debug(message: any, context?: string) {
        this.logger.debug(message as string, { context });
    }

    verbose(message: any, context?: string) {
        this.logger.verbose(message as string, { context });
    }
}
