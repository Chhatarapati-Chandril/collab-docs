import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService {
    private readonly saltRounds: number;

    constructor(private readonly configService: ConfigService) {
        const saltRounds = Number(this.configService.getOrThrow<string>('SALT_ROUNDS'));

        if (!Number.isInteger(saltRounds) || saltRounds < 0) {
            throw new InternalServerErrorException('Invalid hashing configuration');
        }

        this.saltRounds = saltRounds;
    }

    async hash(value: string): Promise<string> {
        return bcrypt.hash(value, this.saltRounds);
    }

    async compare(value: string, hashedValue: string): Promise<boolean> {
        return bcrypt.compare(value, hashedValue);
    }
}
