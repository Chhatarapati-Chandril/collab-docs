import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

import { ApiResponse } from '../common/dto/api-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';

import { ConfigService } from '@nestjs/config';
import { Serialize } from '../common/intercepters/serialize.interceptor';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { ApiTags } from '@nestjs/swagger';
import { GoogleAuthDto } from './dto/google-auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {}

    @Post('google')
    @HttpCode(HttpStatus.OK)
    @Serialize(LoginResponseDto)
    async googleLogin(
        @Body() dto: GoogleAuthDto,
        @Res({ passthrough: true }) response: Response,
    ): Promise<ApiResponse<LoginResponseDto>> {
        const result = await this.authService.loginWithGoogle(dto);

        const refreshTokenExpiresInDays = Number(
            this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS'),
        );

        response.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
        });

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Login successful',
            data: {
                accessToken: result.accessToken,
                user: result.user,
            },
        });
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Serialize(RefreshResponseDto)
    async refresh(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<ApiResponse<RefreshResponseDto>> {
        const refreshToken = request.cookies.refreshToken as string | undefined;
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token is missing');
        }

        const result = await this.authService.refresh(refreshToken);

        const refreshTokenExpiresInDays = Number(
            this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS'),
        );

        response.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
        });

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Token refreshed successfully',
            data: { accessToken: result.accessToken },
        });
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ): Promise<ApiResponse<null>> {
        const refreshToken = request.cookies.refreshToken as string | undefined;
        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        response.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Logged out successfully',
            data: null,
        });
    }
}
