import { Permission } from '@prisma/client';

export const PERMISSION_LEVELS: Record<Permission, number> = {
    [Permission.VIEWER]: 1,
    [Permission.EDITOR]: 2,
    [Permission.OWNER]: 3,
};
export const PERMISSION_MESSAGES: Record<Permission, string> = {
    VIEWER: 'You need at least viewer permission to access this document',
    EDITOR: 'You need at least editor permission to perform this action',
    OWNER: 'You must be the document owner to perform this action',
} as const;
