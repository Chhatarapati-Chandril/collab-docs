import { Permission } from '@prisma/client';
import { Expose, Type } from 'class-transformer';

class PermissionUserDto {
    @Expose()
    id!: string;

    @Expose()
    displayName!: string;

    @Expose()
    email!: string;
}

export class DocPermissionResponseDto {
    @Expose()
    id!: string;

    @Expose()
    permission!: Permission;

    @Expose()
    @Type(() => PermissionUserDto)
    user!: PermissionUserDto;
}
