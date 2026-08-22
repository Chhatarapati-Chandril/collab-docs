import { Permission } from '@prisma/client';
import { Expose } from 'class-transformer';

export class DocumentResponseDto {
    @Expose()
    id!: string;

    @Expose()
    title!: string;

    @Expose()
    ownerId!: string;

    @Expose()
    isAnonymous!: boolean;

    @Expose()
    publicAccess!: Permission | null;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}
