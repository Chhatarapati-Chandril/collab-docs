import {
    Injectable,
    UnauthorizedException,
    InternalServerErrorException,
    HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { HashService } from '../common/hash/hash.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginResult } from './types/login-result.type';

@Injectable()
export class AuthService {
    private readonly googleClient: OAuth2Client;

    constructor(
        private readonly prisma: PrismaService,
        private readonly tokenService: TokenService,
        private readonly hashService: HashService,
        private readonly configService: ConfigService,
    ) {
        this.googleClient = new OAuth2Client(
            this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        );
    }

    async loginWithGoogle(dto: GoogleAuthDto): Promise<LoginResult> {
        const payload = await this.verifyGoogleToken(dto.idToken);
        const user = await this.findOrCreateGoogleUser(payload);
        return this.issueTokensForUser(user);
    }

    private async verifyGoogleToken(idToken: string): Promise<TokenPayload> {
        let payload: TokenPayload | undefined;

        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            });
            payload = ticket.getPayload();
        } catch {
            throw new UnauthorizedException('Invalid Google token');
        }

        if (!payload || !payload.email || !payload.sub) {
            throw new UnauthorizedException('Google token missing required fields');
        }

        return payload;
    }

    private async findOrCreateGoogleUser(payload: TokenPayload): Promise<User> {
        const googleId = payload.sub;
        const email = payload.email as string; // narrowed non-null by verifyGoogleToken's check above

        let user = await this.prisma.user.findUnique({ where: { googleId } });

        if (user) {
            return user;
        }

        user = await this.prisma.user.findUnique({ where: { email } });

        if (user) {
            return this.prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId,
                    avatarUrl: payload.picture ?? null,
                },
            });
        }

        return this.prisma.user.create({
            data: {
                email,
                displayName: payload.name ?? email.split('@')[0],
                googleId,
                avatarUrl: payload.picture ?? null,
            },
        });
    }

    private async issueTokensForUser(user: User): Promise<LoginResult> {
        const jwtPayload = { sub: user.id, email: user.email };
        const accessToken = this.tokenService.generateAccessToken(jwtPayload);
        const refreshToken = this.tokenService.generateRefreshToken(jwtPayload);

        const expiresAt = new Date();
        const ttl = Number(
            this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS'),
        );
        expiresAt.setDate(expiresAt.getDate() + ttl);

        const hashedRefreshToken = this.hashService.hashToken(refreshToken);

        await this.prisma.refreshToken.create({
            data: { token: hashedRefreshToken, userId: user.id, expiresAt },
        });

        const { password, ...result } = user; // eslint-disable-line @typescript-eslint/no-unused-vars

        return { accessToken, refreshToken, user: result };
    }

    async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        try {
            const payload = this.tokenService.verifyRefreshToken(refreshToken);

            const hashedRefreshToken = this.hashService.hashToken(refreshToken);

            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { token: hashedRefreshToken },
            });

            if (!storedToken || storedToken.userId !== payload.sub) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            if (storedToken.expiresAt <= new Date()) {
                await this.prisma.refreshToken.delete({
                    where: { id: storedToken.id },
                });
                throw new UnauthorizedException('Refresh token has expired');
            }

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user) {
                throw new UnauthorizedException('User no longer exists');
            }

            const newPayload = {
                sub: user.id,
                email: user.email,
            };

            const newAccessToken = this.tokenService.generateAccessToken(newPayload);
            const newRefreshToken = this.tokenService.generateRefreshToken(newPayload);

            const refreshTokenExpiresInDays = Number(
                this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS'),
            );

            if (!Number.isInteger(refreshTokenExpiresInDays) || refreshTokenExpiresInDays <= 0) {
                throw new InternalServerErrorException(
                    'Invalid refresh token expiration configuration',
                );
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + refreshTokenExpiresInDays);

            const newHashedRefreshToken = this.hashService.hashToken(newRefreshToken);

            await this.prisma.$transaction([
                this.prisma.refreshToken.delete({
                    where: {
                        id: storedToken.id,
                    },
                }),
                this.prisma.refreshToken.create({
                    data: {
                        token: newHashedRefreshToken,
                        userId: user.id,
                        expiresAt,
                    },
                }),
            ]);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to refresh authentication');
        }
    }

    async logout(refreshToken: string): Promise<void> {
        try {
            const payload = this.tokenService.verifyRefreshToken(refreshToken);
            const hashedRefreshToken = this.hashService.hashToken(refreshToken);

            await this.prisma.refreshToken.deleteMany({
                where: {
                    token: hashedRefreshToken,
                    userId: payload.sub,
                },
            });
        } catch (error) {
            // Logout should still succeed from the client's perspective.
            // The cookie will be cleared by the controller.
            if (!(error instanceof UnauthorizedException)) {
                console.error('LOGOUT ERROR:', error);
            }
        }
    }
}
