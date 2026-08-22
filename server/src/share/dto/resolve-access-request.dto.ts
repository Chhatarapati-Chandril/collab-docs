import { IsEnum, IsIn, IsNotEmpty } from 'class-validator';
import { Permission } from '@prisma/client';
import { SHARE_CONSTANTS } from '../../common/constants/share.constants';

type AccessRequestAction =
    (typeof SHARE_CONSTANTS.ACCESS_REQUEST_ACTIONS)[keyof typeof SHARE_CONSTANTS.ACCESS_REQUEST_ACTIONS];

export class ResolveAccessRequestDto {
    @IsEnum(SHARE_CONSTANTS.ACCESS_REQUEST_ACTIONS)
    @IsNotEmpty()
    action!: AccessRequestAction;

    // The frontend will default this to what the user requested,
    // but the owner can change it (e.g., from EDITOR to VIEWER) before clicking approve.
    @IsIn([Permission.EDITOR, Permission.VIEWER])
    @IsNotEmpty()
    grantedPermission!: Permission;
}
