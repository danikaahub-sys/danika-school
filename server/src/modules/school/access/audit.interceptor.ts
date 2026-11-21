import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { IAuthUser } from 'src/common/request/interfaces/request.interface';

import type { SchoolContext } from './school-context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly db: DatabaseService) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<{
            method: string;
            url: string;
            user?: IAuthUser;
            schoolContext?: SchoolContext;
            params?: Record<string, string>;
            body?: unknown;
        }>();
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            return next.handle();
        }
        const ctx = request.schoolContext;
        if (!ctx) return next.handle();
        return next.handle().pipe(
            tap(() => {
                void this.db.auditLog.create({
                    data: {
                        schoolId: ctx.schoolId,
                        actorUserId: ctx.userId,
                        actorMembershipId: ctx.membershipId,
                        action: `${request.method} ${request.url}`,
                        entity: request.params?.id ? 'record' : 'collection',
                        entityId: request.params?.id ?? null,
                        diff: request.body ?? undefined,
                    },
                });
            })
        );
    }
}
