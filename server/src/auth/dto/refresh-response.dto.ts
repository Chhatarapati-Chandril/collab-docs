import { Expose } from 'class-transformer';

export class RefreshResponseDto {
    @Expose()
    accessToken!: string;
}
