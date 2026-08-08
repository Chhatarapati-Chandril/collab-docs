import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { HashService } from '../common/hash/hash.service';

@Module({
    imports: [ConfigModule, JwtModule.register({})],
    controllers: [AuthController],
    providers: [AuthService, TokenService, HashService],
    exports: [AuthService, TokenService],
})
export class AuthModule {}
