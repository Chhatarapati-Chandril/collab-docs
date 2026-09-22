export type Permission = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Document {
    id: string;
    title: string;
    ownerId: string;
    isAnonymous: boolean;
    publicAccess: Permission | null;
    createdAt: string;
    updatedAt: string;

    // UI / Joined fields from backend
    _count?: { permissions: number };
    owner?: { id: string; displayName: string };
    permission?: Permission;
}

export interface DocumentCollection {
    count: number;
    documents: Document[];
}

export interface GetDocumentsResponse {
    myDocuments: DocumentCollection;
    sharedWithMe: DocumentCollection;
}
