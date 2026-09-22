import { Permission } from '@prisma/client';
import { Expose, Type } from 'class-transformer';
import { OwnerSummaryDto } from './owner-summary.dto';

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

    @Expose()
    _count?: { permissions: number };

    @Expose()
    @Type(() => OwnerSummaryDto)
    owner?: OwnerSummaryDto;

    @Expose()
    permission?: Permission;
}
