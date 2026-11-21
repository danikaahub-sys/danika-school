import { applyDecorators, UseGuards, UseInterceptors } from '@nestjs/common';

import { AuditInterceptor } from './audit.interceptor';
import { PermissionGuard } from './permission.guard';
import { SchoolContextGuard } from './school-context.guard';

export function SchoolGuards(): ClassDecorator & MethodDecorator {
    return applyDecorators(
        UseGuards(SchoolContextGuard, PermissionGuard),
        UseInterceptors(AuditInterceptor)
    );
}
