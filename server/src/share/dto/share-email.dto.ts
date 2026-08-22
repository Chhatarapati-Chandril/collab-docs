import { IsEmail, IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import { Permission } from '@prisma/client';

export class ShareEmailDto {
    @IsUUID()
    @IsNotEmpty()
    docId!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsIn([Permission.EDITOR, Permission.VIEWER])
    @IsNotEmpty()
    permission!: Permission;
}
