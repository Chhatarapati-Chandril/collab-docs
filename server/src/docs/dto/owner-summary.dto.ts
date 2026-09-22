import { Expose } from 'class-transformer';

export class OwnerSummaryDto {
    @Expose()
    id!: string;

    @Expose()
    displayName!: string;
}
