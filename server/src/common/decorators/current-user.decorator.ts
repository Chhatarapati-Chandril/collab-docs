import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserPayload } from '../../auth/types/current-user-payload.type';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
        const request = ctx.switchToHttp().getRequest<{ user: CurrentUserPayload }>();

        return request.user;
    },
);
