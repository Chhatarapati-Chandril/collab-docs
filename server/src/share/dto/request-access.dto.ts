import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import { Permission } from '@prisma/client';

export class RequestAccessDto {
    @IsUUID()
    @IsNotEmpty()
    docId!: string;

    @IsIn([Permission.EDITOR, Permission.VIEWER])
    @IsNotEmpty()
    permission!: Permission;
}
