import { Controller, Get, Patch, Body, Query, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiResponse } from '../common/dto/api-response.dto';
import type { RequestWithUser } from '../common/types/request-with-user.type';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    async getProfile(@Req() req: RequestWithUser) {
        const user = await this.usersService.getProfile(req.user.userId);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Profile fetched successfully',
            data: user,
        });
    }

    @Patch('me')
    async updateProfile(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
        const updatedUser = await this.usersService.updateProfile(req.user.userId, dto);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Profile updated successfully',
            data: updatedUser,
        });
    }

    @Get('search')
    async searchUsers(@Req() req: RequestWithUser, @Query('email') email: string) {
        const users = await this.usersService.searchUsers(email, req.user.userId);
        return new ApiResponse({
            statusCode: HttpStatus.OK,
            message: 'Users fetched successfully',
            data: users,
        });
    }
}
