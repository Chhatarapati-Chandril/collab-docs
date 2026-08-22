import { Permission } from '@prisma/client';

export interface CollabSocketData {
    userId: string;
    docId: string;
    userRole: Permission;
    isAnonymousDoc: boolean;
    accessRevoked: boolean;
}
