import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
    GLOBAL_AUTH_KEY,
    PUBLIC_ROUTE_KEY,
} from 'src/common/request/constants/request.constant';
import type { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { SchoolContextService } from './school-context.service';

@Injectable()
export class SchoolContextGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly schoolContextService: SchoolContextService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            PUBLIC_ROUTE_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (isPublic) return true;

        const isGlobal = this.reflector.getAllAndOverride<boolean>(
            GLOBAL_AUTH_KEY,
            [context.getHandler(), context.getClass()]
        );
        const request = context.switchToHttp().getRequest<{
            user?: IAuthUser;
            headers: Record<string, string | string[] | undefined>;
            schoolContext?: unknown;
        }>();
        const user = request.user;
        if (!user?.userId) {
            throw new UnauthorizedException(
                'auth.error.accessTokenUnauthorized'
            );
        }
        if (isGlobal) {
            if (user.typ === 'school') {
                throw new ForbiddenException(
                    'school.error.globalTokenRequired'
                );
            }
            return true;
        }
        if (user.typ !== 'school' || !user.schoolId || !user.membershipId) {
            throw new ForbiddenException('school.error.schoolTokenRequired');
        }
        const yearHeader = headerValue(request.headers['x-year-id']);
        request.schoolContext = await this.schoolContextService.resolve(
            user.userId,
            user.membershipId,
            user.schoolId,
            user.permVersion ?? 0,
            yearHeader
        );
        return true;
    }
}

function headerValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}
