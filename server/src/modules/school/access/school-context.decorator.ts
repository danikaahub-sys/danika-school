import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { SchoolContext } from './school-context';

export const Ctx = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): SchoolContext => {
        const request = ctx.switchToHttp().getRequest<{
            schoolContext?: SchoolContext;
        }>();
        return request.schoolContext as SchoolContext;
    }
);
