import { IsEnum, IsOptional } from 'class-validator';
import { Permission } from '@prisma/client';

export class SetPublicAccessDto {
    // Optional because passing null/undefined means "Restricted"
    @IsOptional()
    @IsEnum([Permission.VIEWER, Permission.EDITOR])
    publicAccess?: Permission | null;
}
