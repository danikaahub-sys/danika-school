import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
    BaseRole,
    MembershipStatus,
    MoneyUnit,
    OrgMemberRole,
    PersonKind,
    PersonStatus,
} from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';

import {
    permissionsForRole,
    prismaRoleToCatalog,
} from '../access/permission.catalog';

const DEFAULT_POSITIONS: Array<{
    name: string;
    baseRole: BaseRole;
    isAll?: boolean;
}> = [
    { name: 'مدیر مدرسه', baseRole: BaseRole.PRINCIPAL, isAll: true },
    { name: 'معاون', baseRole: BaseRole.DEPUTY },
    { name: 'معلم', baseRole: BaseRole.TEACHER },
    { name: 'حسابدار', baseRole: BaseRole.FINANCE },
    { name: 'دانش‌آموز', baseRole: BaseRole.STUDENT },
    { name: 'ولی', baseRole: BaseRole.GUARDIAN },
];

const SEPTEMBER = 8;

export function academicYearInput(now: Date) {
    const startYear =
        now.getUTCMonth() >= SEPTEMBER
            ? now.getUTCFullYear()
            : now.getUTCFullYear() - 1;
    return {
        label: `${startYear}–${startYear + 1}`,
        startsOn: new Date(Date.UTC(startYear, SEPTEMBER, 23)),
        endsOn: new Date(Date.UTC(startYear + 1, 5, 21)),
        isActive: true,
    };
}

@Injectable()
export class SchoolOrgService {
    constructor(private readonly db: DatabaseService) {}

    async listOrganizations(userId: string) {
        const memberships = await this.db.organizationMember.findMany({
            where: {
                userId,
                role: { in: [OrgMemberRole.OWNER, OrgMemberRole.ADMIN] },
            },
            include: {
                organization: {
                    include: {
                        schools: {
                            where: { deletedAt: null },
                            orderBy: { createdAt: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                city: true,
                                moneyUnit: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return memberships
            .filter(row => !row.organization.deletedAt)
            .map(row => ({
                id: row.organization.id,
                name: row.organization.name,
                role: row.role,
                schools: row.organization.schools,
            }));
    }

    async createSchool(
        userId: string,
        organizationId: string,
        data: { name: string; city: string; moneyUnit?: MoneyUnit }
    ) {
        const membership = await this.db.organizationMember.findFirst({
            where: {
                organizationId,
                userId,
                role: OrgMemberRole.OWNER,
                organization: { deletedAt: null },
            },
        });
        if (!membership) {
            throw new HttpException(
                'school.error.notOrgOwner',
                HttpStatus.FORBIDDEN
            );
        }
        const user = await this.db.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new HttpException(
                'school.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        const moneyUnit = data.moneyUnit ?? MoneyUnit.TOMAN;
        const year = academicYearInput(new Date());
        return this.db.$transaction(async tx => {
            const school = await tx.school.create({
                data: {
                    organizationId,
                    name: data.name,
                    city: data.city,
                    moneyUnit,
                    settings: { create: { locale: 'fa' } },
                },
            });
            let principalId = '';
            for (const item of DEFAULT_POSITIONS) {
                const position = await tx.position.create({
                    data: {
                        schoolId: school.id,
                        name: item.name,
                        baseRole: item.baseRole,
                        isAll: item.isAll ?? false,
                        permissions: item.isAll
                            ? []
                            : permissionsForRole(
                                  prismaRoleToCatalog(item.baseRole)
                              ),
                    },
                });
                if (item.baseRole === BaseRole.PRINCIPAL) {
                    principalId = position.id;
                }
            }
            await tx.academicYear.create({
                data: { schoolId: school.id, ...year },
            });
            const person = await tx.person.create({
                data: {
                    schoolId: school.id,
                    userId,
                    kind: PersonKind.STAFF,
                    firstName: user.firstName ?? user.userName,
                    lastName: user.lastName ?? '',
                    phone: user.phone,
                    status: PersonStatus.ACTIVE,
                },
            });
            const schoolMembership = await tx.schoolMembership.create({
                data: {
                    schoolId: school.id,
                    userId,
                    personId: person.id,
                    positionId: principalId,
                    status: MembershipStatus.ACTIVE,
                },
            });
            return {
                organizationId,
                schoolId: school.id,
                membershipId: schoolMembership.id,
                name: school.name,
                city: school.city,
                moneyUnit: school.moneyUnit,
            };
        });
    }
}
