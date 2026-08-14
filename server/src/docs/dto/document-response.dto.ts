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
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}
