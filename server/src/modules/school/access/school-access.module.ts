import { Module } from '@nestjs/common';

import { CacheModule } from 'src/common/cache/cache.module';
import { DatabaseModule } from 'src/common/database/database.module';

import { AuditInterceptor } from './audit.interceptor';
import { PermissionGuard } from './permission.guard';
import { SchoolContextGuard } from './school-context.guard';
import { SchoolContextService } from './school-context.service';
import { ScopeService } from './scope.service';

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [
        SchoolContextService,
        ScopeService,
        SchoolContextGuard,
        PermissionGuard,
        AuditInterceptor,
    ],
    exports: [
        SchoolContextService,
        ScopeService,
        SchoolContextGuard,
        PermissionGuard,
        AuditInterceptor,
    ],
})
export class SchoolAccessModule {}
