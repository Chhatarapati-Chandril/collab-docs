export type NotificationType = 'ACCESS_REQUEST' | 'PERMISSION_CHANGED' | 'DOC_DELETED';

export interface NotificationMeta {
    requestedPermission?: 'EDITOR' | 'VIEWER';
    grantedPermission?: 'EDITOR' | 'VIEWER' | 'REMOVED';
    resolvedAction?: 'APPROVE' | 'DENY';
    resolvedPermission?: 'EDITOR' | 'VIEWER';
    [key: string]: unknown;
}

export interface AppNotification {
    id: string;
    type: NotificationType;
    docId: string;
    fromUserId: string;
    toUserId: string;
    isRead: boolean;
    meta: NotificationMeta | null;
    createdAt: string;
    document: {
        id: string;
        title: string;
    };
    fromUser: {
        id: string;
        displayName: string;
        email: string;
    };

    // UI Local State
    _resolved?: boolean;
    _resolvedText?: string;
}
