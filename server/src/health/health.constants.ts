export const HEALTH_CONSTANTS = {
    SERVICE_NAME: 'collab-docs-api',

    DATABASE_TIMEOUT_MS: 3000,

    STATUS: {
        OK: 'ok',
        DEGRADED: 'degraded',
        DOWN: 'down',
    },
} as const;
