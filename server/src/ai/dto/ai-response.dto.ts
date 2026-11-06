import { Expose } from 'class-transformer';

export class AiResponseDto {
    @Expose()
    text!: string;

    @Expose()
    action!: string;

    @Expose()
    model!: string;

    @Expose()
    finishReason?: string;
}
