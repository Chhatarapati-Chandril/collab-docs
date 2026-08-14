import { Expose, Type } from 'class-transformer';
import { DocumentResponseDto } from './document-response.dto';

export class DocumentCollectionDto {
    @Expose()
    count!: number;

    @Expose()
    @Type(() => DocumentResponseDto)
    documents!: DocumentResponseDto[];
}

export class GetDocumentsResponseDto {
    @Expose()
    @Type(() => DocumentCollectionDto)
    myDocuments!: DocumentCollectionDto;

    @Expose()
    @Type(() => DocumentCollectionDto)
    sharedWithMe!: DocumentCollectionDto;
}
