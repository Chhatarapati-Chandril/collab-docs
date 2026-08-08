import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { ApiResponse } from '../common/dto/api-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {}

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto): Promise<ApiResponse<RegisterResponseDto>> {
        const result = await this.authService.register(dto);

        return new ApiResponse({
            statusCode: HttpStatus.CREATED,
            message: 'User registered successfully',
            data: result,
        });
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) response: Response,
    ): Promise<ApiResponse<LoginResponseDto>> {
        const result = await this.authService.login(dto);

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
            message: 'Login successful',
            data: {
                accessToken: result.accessToken,
                user: result.user,
            },
        });
    }
}
