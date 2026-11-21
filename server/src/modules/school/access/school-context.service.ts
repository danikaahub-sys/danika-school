import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';

import { CacheService } from 'src/common/cache/services/cache.service';
import { DatabaseService } from 'src/common/database/services/database.service';

import {
    type PermissionKey,
    prismaRoleToCatalog,
    permissionsForRole,
} from './permission.catalog';
import type { SchoolContext } from './school-context';

const CACHE_TTL = 300;

type CachedMembership = {
    schoolId: string;
    personId: string;
    positionId: string;
    baseRole: SchoolContext['baseRole'];
    permissions: PermissionKey[] | 'all';
    permVersion: number;
    status: MembershipStatus;
};

@Injectable()
export class SchoolContextService {
    constructor(
        private readonly db: DatabaseService,
        private readonly cache: CacheService
    ) {}

    async resolve(
        userId: string,
        membershipId: string,
        schoolId: string,
        permVersion: number,
        yearHeader?: string
    ): Promise<SchoolContext> {
        const cached = await this.loadMembership(membershipId, permVersion);
        if (
            !cached ||
            cached.schoolId !== schoolId ||
            cached.permVersion !== permVersion ||
            cached.status !== MembershipStatus.ACTIVE
        ) {
            throw new HttpException(
                'school.error.membershipInvalid',
                HttpStatus.FORBIDDEN
            );
        }
        const yearId = await this.resolveYear(schoolId, yearHeader);
        return {
            userId,
            schoolId,
            membershipId,
            personId: cached.personId,
            positionId: cached.positionId,
            baseRole: cached.baseRole,
            permissions: cached.permissions,
            permVersion: cached.permVersion,
            yearId,
        };
    }

    async bumpPermVersion(schoolId: string, positionId: string): Promise<void> {
        const memberships = await this.db.schoolMembership.findMany({
            where: { schoolId, positionId },
            select: { id: true, permVersion: true },
        });
        await this.db.schoolMembership.updateMany({
            where: { schoolId, positionId },
            data: { permVersion: { increment: 1 } },
        });
        await this.cache.del(
            ...memberships.map(item => this.cacheKey(item.id, item.permVersion))
        );
    }

    private cacheKey(membershipId: string, permVersion: number): string {
        return `school:membership:${membershipId}:${permVersion}`;
    }

    private async loadMembership(
        membershipId: string,
        permVersion: number
    ): Promise<CachedMembership | null> {
        const key = this.cacheKey(membershipId, permVersion);
        const hit = await this.cache.get<CachedMembership>(key);
        if (hit) return hit;
        const membership = await this.db.schoolMembership.findUnique({
            where: { id: membershipId },
            include: { position: true },
        });
        if (!membership) return null;
        const permissions: PermissionKey[] | 'all' = membership.position.isAll
            ? 'all'
            : membership.position.permissions.length > 0
              ? (membership.position.permissions as PermissionKey[])
              : permissionsForRole(
                    prismaRoleToCatalog(membership.position.baseRole)
                );
        const cached: CachedMembership = {
            schoolId: membership.schoolId,
            personId: membership.personId,
            positionId: membership.positionId,
            baseRole: membership.position.baseRole,
            permissions,
            permVersion: membership.permVersion,
            status: membership.status,
        };
        await this.cache.set(key, cached, CACHE_TTL);
        return cached;
    }

    private async resolveYear(
        schoolId: string,
        yearHeader?: string
    ): Promise<string> {
        if (yearHeader) {
            const year = await this.db.academicYear.findFirst({
                where: { id: yearHeader, schoolId, deletedAt: null },
            });
            if (!year) {
                throw new HttpException(
                    'school.error.yearNotFound',
                    HttpStatus.BAD_REQUEST
                );
            }
            return year.id;
        }
        const active = await this.db.academicYear.findFirst({
            where: { schoolId, isActive: true, deletedAt: null },
        });
        if (!active) {
            throw new HttpException(
                'school.error.yearNotFound',
                HttpStatus.BAD_REQUEST
            );
        }
        return active.id;
    }
}
