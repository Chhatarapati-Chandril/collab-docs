import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class MyLoggerService implements LoggerService {
    private context?: string;

    setContext(context: string) {
        this.context = context;
    }

    private readonly logger: winston.Logger;

    constructor() {
        const isDev = process.env.NODE_ENV !== 'production';
        const defaultLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

        const customColors = {
            error: 'red',
            warn: 'yellow',
            info: 'green',
            debug: 'blue',
            verbose: 'cyan',
        };
        winston.addColors(customColors);

        this.logger = winston.createLogger({
            level: defaultLevel,
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp({ format: 'MM/DD/YYYY, hh:mm:ss.SSS A' }),
                        winston.format.colorize({ level: true }), // Colorize ONLY the log level
                        winston.format.printf((info) => {
                            const timestamp =
                                typeof info.timestamp === 'string' ? info.timestamp : '';
                            const level = typeof info.level === 'string' ? info.level : '';
                            const message =
                                typeof info.message === 'string'
                                    ? info.message
                                    : JSON.stringify(info.message);

                            const rawContext = info.context;
                            const contextStr = rawContext
                                ? typeof rawContext === 'string'
                                    ? rawContext
                                    : JSON.stringify(rawContext)
                                : '';

                            // Custom ANSI Colors for other parts
                            const cyan = '\x1b[36m';
                            const magenta = '\x1b[35m'; // Pink/Magenta for context
                            const gray = '\x1b[90m';
                            const reset = '\x1b[0m';

                            const pid = `${cyan}${process.pid}${reset}`;
                            const ts = `${gray}${timestamp}${reset}`;
                            const context = contextStr ? `${magenta}[${contextStr}]${reset} ` : '';

                            const rawStack = info.stack;
                            const stackStr = rawStack
                                ? typeof rawStack === 'string'
                                    ? rawStack
                                    : JSON.stringify(rawStack)
                                : '';
                            const stack = stackStr ? `\n\x1b[31m${stackStr}${reset}` : '';

                            return `[Nest] ${pid}  - ${ts}     ${level} ${context}${message}${stack}`;
                        }),
                    ),
                }),

                new winston.transports.DailyRotateFile({
                    filename: 'logs/app-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxFiles: '14d',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json(),
                    ),
                }),

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

    private formatMessage(message: unknown): string {
        return typeof message === 'string' ? message : JSON.stringify(message);
    }

    log(message: unknown, context?: string) {
        this.logger.info(this.formatMessage(message), { context });
    }

    error(message: unknown, trace?: string, context?: string) {
        if (message instanceof Error) {
            this.logger.error(message.message, { stack: message.stack, context: trace || context });
        } else {
            this.logger.error(this.formatMessage(message), { stack: trace, context });
        }
    }

    warn(message: unknown, context?: string) {
        this.logger.warn(this.formatMessage(message), { context });
    }

    debug(message: unknown, context?: string) {
        this.logger.debug(this.formatMessage(message), { context });
    }

    verbose(message: unknown, context?: string) {
        this.logger.verbose(this.formatMessage(message), { context });
    }
}
