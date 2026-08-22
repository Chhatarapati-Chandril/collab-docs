import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from '@prisma/client';

// Reusable select block to guarantee passwords never leak
const userSelect = {
    id: true,
    email: true,
    displayName: true,
    createdAt: true,
    updatedAt: true,
};

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    // 1. Fetch Logged-in Profile
    async getProfile(userId: string): Promise<Omit<User, 'password'>> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: userSelect,
        });

        if (!user) throw new NotFoundException('User profile not found');
        return user;
    }

    // 2. Update Profile Name
    async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { displayName: dto.displayName },
            select: userSelect,
        });
    }

    // 3. Search Users by Email (for the Share Document dropdown)
    async searchUsers(
        emailQuery: string,
        currentUserId: string,
    ): Promise<Omit<User, 'password'>[]> {
        if (!emailQuery || emailQuery.trim().length === 0) return [];

        return this.prisma.user.findMany({
            where: {
                email: { contains: emailQuery, mode: 'insensitive' },
                id: { not: currentUserId }, // Prevent sharing with yourself
            },
            select: userSelect,
            take: 5, // Limit results so the UI dropdown doesn't lag
        });
    }
}
