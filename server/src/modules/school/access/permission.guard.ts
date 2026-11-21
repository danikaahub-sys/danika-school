import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSION_KEY } from 'src/common/request/constants/request.constant';

import { hasPermission, type PermissionKey } from './permission.catalog';
import type { SchoolContext } from './school-context';

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const key = this.reflector.getAllAndOverride<PermissionKey>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()]
        );
        if (!key) return true;
        const request = context.switchToHttp().getRequest<{
            schoolContext?: SchoolContext;
        }>();
        if (!hasPermission(request.schoolContext?.permissions, key)) {
            throw new ForbiddenException('auth.error.insufficientPermissions');
        }
        return true;
    }
}
