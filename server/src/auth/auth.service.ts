import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    InternalServerErrorException,
    HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { HashService } from '../common/hash/hash.service';
import { LoginResult } from './types/login-result.type';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tokenService: TokenService,
        private readonly hashService: HashService,
        private readonly configService: ConfigService,
    ) {}

    async register(dto: RegisterDto): Promise<RegisterResponseDto> {
        // 1. check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // 2. hash the password
        const hashedPassword = await this.hashService.hash(dto.password);

        try {
            // 3. create user in supabase via prisma
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    displayName: dto.displayName,
                    password: hashedPassword,
                },
            });

            // 4. exclude the hashed password before returning
            const { password, ...result } = user;
            return {
                user: result,
            };
        } catch {
            throw new InternalServerErrorException('Failed to register user');
        }
    }

    async login(dto: LoginDto): Promise<LoginResult> {
        try {
            // 1. find user
            const user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });

            if (!user || !(await this.hashService.compare(dto.password, user.password))) {
                throw new UnauthorizedException('Invalid email or password');
            }

            const payload = {
                sub: user.id,
                email: user.email,
            };

            // 2. generate access and refresh token
            const accessToken = this.tokenService.generateAccessToken(payload);
            const refreshToken = this.tokenService.generateRefreshToken(payload);

            // 3. save refresh token in db
            const expiresAt = new Date();
            const ttl = Number(
                this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS'),
            );
            expiresAt.setDate(expiresAt.getDate() + ttl);

            const hashedRefreshToken = await this.hashService.hash(refreshToken);

            await this.prisma.refreshToken.create({
                data: {
                    token: hashedRefreshToken,
                    userId: user.id,
                    expiresAt,
                },
            });

            const { password, ...result } = user;

            return {
                accessToken,
                refreshToken,
                user: result,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to log in user');
        }
    }
}
