import { randomBytes } from 'crypto';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseRole, MembershipStatus } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import {
    paginate,
    PaginationQueryDto,
    skipTake,
} from 'src/common/pagination/pagination.dto';

import {
    permissionsForRole,
    prismaRoleToCatalog,
} from '../access/permission.catalog';
import type { SchoolContext } from '../access/school-context';
import { SchoolContextService } from '../access/school-context.service';
import { SchoolSessionService } from '../session/school-session.service';

@Injectable()
export class SchoolAdminService {
    constructor(
        private readonly db: DatabaseService,
        private readonly schoolContextService: SchoolContextService,
        private readonly sessionService: SchoolSessionService
    ) {}

    async users(ctx: SchoolContext, query: PaginationQueryDto) {
        const { skip, take } = skipTake(query);
        const where = { schoolId: ctx.schoolId };
        const [items, total] = await this.db.$transaction([
            this.db.schoolMembership.findMany({
                where,
                skip,
                take,
                include: { user: true, person: true, position: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.db.schoolMembership.count({ where }),
        ]);
        return paginate(items, total, query);
    }

    positions(ctx: SchoolContext) {
        return this.db.position.findMany({
            where: { schoolId: ctx.schoolId },
            orderBy: { name: 'asc' },
        });
    }

    createPosition(
        ctx: SchoolContext,
        data: { name: string; baseRole: BaseRole; permissions?: string[] }
    ) {
        const catalogRole = prismaRoleToCatalog(data.baseRole);
        const permissions =
            data.permissions && data.permissions.length > 0
                ? data.permissions
                : permissionsForRole(catalogRole);
        return this.db.position.create({
            data: {
                schoolId: ctx.schoolId,
                name: data.name,
                baseRole: data.baseRole,
                permissions,
                isAll: catalogRole === 'principal',
            },
        });
    }

    async updatePosition(
        ctx: SchoolContext,
        id: string,
        data: { name?: string; permissions?: string[]; isAll?: boolean }
    ) {
        const position = await this.db.position.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
        if (!position) {
            throw new HttpException(
                'school.error.positionNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        const updated = await this.db.position.update({
            where: { id },
            data: {
                name: data.name,
                permissions: data.permissions,
                isAll: data.isAll,
            },
        });
        await this.schoolContextService.bumpPermVersion(ctx.schoolId, id);
        return updated;
    }

    async invite(
        ctx: SchoolContext,
        data: { phone: string; positionId: string; personId: string }
    ) {
        const token = randomBytes(24).toString('hex');
        const invitation = await this.db.invitation.create({
            data: {
                schoolId: ctx.schoolId,
                tokenHash: this.sessionService.hashToken(token),
                phone: data.phone,
                positionId: data.positionId,
                personId: data.personId,
                invitedById: ctx.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return { id: invitation.id, token };
    }

    async resendInvite(ctx: SchoolContext, id: string) {
        const invitation = await this.db.invitation.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
        if (!invitation) {
            throw new HttpException(
                'school.error.invitationInvalid',
                HttpStatus.NOT_FOUND
            );
        }
        const token = randomBytes(24).toString('hex');
        await this.db.invitation.update({
            where: { id },
            data: {
                tokenHash: this.sessionService.hashToken(token),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return { id, token };
    }

    async deactivate(ctx: SchoolContext, membershipId: string) {
        const membership = await this.db.schoolMembership.findFirst({
            where: { id: membershipId, schoolId: ctx.schoolId },
        });
        if (!membership) {
            throw new HttpException(
                'school.error.membershipInvalid',
                HttpStatus.NOT_FOUND
            );
        }
        return this.db.schoolMembership.update({
            where: { id: membershipId },
            data: { status: MembershipStatus.DEACTIVATED },
        });
    }

    async audit(ctx: SchoolContext, query: PaginationQueryDto) {
        const { skip, take } = skipTake(query);
        const where = { schoolId: ctx.schoolId };
        const [items, total] = await this.db.$transaction([
            this.db.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.db.auditLog.count({ where }),
        ]);
        return paginate(items, total, query);
    }

    async settings(ctx: SchoolContext) {
        const school = await this.db.school.findUnique({
            where: { id: ctx.schoolId },
            include: { settings: true },
        });
        return school;
    }

    async updateSettings(
        ctx: SchoolContext,
        data: {
            name?: string;
            city?: string;
            moneyUnit?: 'IRR' | 'TOMAN';
            smsSender?: string;
        }
    ) {
        const school = await this.db.school.update({
            where: { id: ctx.schoolId },
            data: {
                name: data.name,
                city: data.city,
                moneyUnit: data.moneyUnit,
            },
        });
        if (data.smsSender !== undefined) {
            await this.db.schoolSettings.upsert({
                where: { schoolId: ctx.schoolId },
                update: { smsSender: data.smsSender },
                create: { schoolId: ctx.schoolId, smsSender: data.smsSender },
            });
        }
        return school;
    }
}
