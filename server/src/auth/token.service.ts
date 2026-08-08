import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
    sub: string;
    email: string;
}

@Injectable()
export class TokenService {
    private readonly accessSecret: string;
    private readonly refreshSecret: string;
    private readonly accessTokenExpiresInSeconds: number;
    private readonly refreshTokenExpiresInSeconds: number;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {
        this.accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
        this.refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

        const accessTokenExpiresInMinutes = Number(
            this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN_MINUTES'),
        );
        const refreshTokenExpiresInDays = Number(
            this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS'),
        );

        if (!Number.isInteger(accessTokenExpiresInMinutes) || accessTokenExpiresInMinutes <= 0) {
            throw new InternalServerErrorException(
                'Invalid JWT access token expiration configuration',
            );
        }
        if (!Number.isInteger(refreshTokenExpiresInDays) || refreshTokenExpiresInDays <= 0) {
            throw new InternalServerErrorException(
                'Invalid JWT refresh token expiration configuration',
            );
        }

        this.accessTokenExpiresInSeconds = accessTokenExpiresInMinutes * 60;
        this.refreshTokenExpiresInSeconds = refreshTokenExpiresInDays * 24 * 60 * 60;
    }

    generateAccessToken(payload: JwtPayload): string {
        return this.jwtService.sign(payload, {
            secret: this.accessSecret,
            expiresIn: this.accessTokenExpiresInSeconds,
        });
    }

    generateRefreshToken(payload: JwtPayload): string {
        return this.jwtService.sign(payload, {
            secret: this.refreshSecret,
            expiresIn: this.refreshTokenExpiresInSeconds,
        });
    }

    verifyAccessToken(token: string): JwtPayload {
        return this.jwtService.verify<JwtPayload>(token, {
            secret: this.accessSecret,
        });
    }

    verifyRefreshToken(token: string): JwtPayload {
        return this.jwtService.verify<JwtPayload>(token, {
            secret: this.refreshSecret,
        });
    }
}
