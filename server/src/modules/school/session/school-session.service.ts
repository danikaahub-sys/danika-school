import { createHash, randomBytes } from 'crypto';

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import * as argon2 from 'argon2';

import { UserRole } from 'src/common/database/enums/role.enum';
import { UserRepository } from 'src/common/database/repositories/user.repository';
import { DatabaseService } from 'src/common/database/services/database.service';
import { AuthService } from 'src/modules/auth/services/auth.service';

import {
    prismaRoleToCatalog,
    permissionsForRole,
} from '../access/permission.catalog';
import type { SchoolContext } from '../access/school-context';

@Injectable()
export class SchoolSessionService {
    constructor(
        private readonly db: DatabaseService,
        private readonly authService: AuthService,
        private readonly userRepository: UserRepository
    ) {}

    async listMemberships(userId: string) {
        const rows = await this.db.schoolMembership.findMany({
            where: {
                userId,
                status: {
                    in: [MembershipStatus.ACTIVE, MembershipStatus.INVITED],
                },
            },
            include: { school: true, position: true },
            orderBy: { createdAt: 'asc' },
        });
        return rows.map(row => ({
            id: row.id,
            schoolId: row.schoolId,
            schoolName: row.school.name,
            city: row.school.city,
            baseRole: row.position.baseRole,
            positionName: row.position.name,
            status: row.status,
        }));
    }

    async createSession(userId: string, schoolId: string) {
        const membership = await this.db.schoolMembership.findUnique({
            where: { schoolId_userId: { schoolId, userId } },
            include: { position: true, user: true },
        });
        if (!membership || membership.status !== MembershipStatus.ACTIVE) {
            throw new HttpException(
                'school.error.membershipInvalid',
                HttpStatus.FORBIDDEN
            );
        }
        const accessToken = await this.authService.issueSchoolAccessToken({
            userId,
            role: membership.user.role,
            schoolId,
            membershipId: membership.id,
            permVersion: membership.permVersion,
        });
        return {
            accessToken,
            schoolId,
            membershipId: membership.id,
        };
    }

    async me(ctx: SchoolContext) {
        const [user, school, years, position, person] = await Promise.all([
            this.userRepository.findById(ctx.userId),
            this.db.school.findUnique({
                where: { id: ctx.schoolId },
                include: { settings: true },
            }),
            this.db.academicYear.findMany({
                where: { schoolId: ctx.schoolId, deletedAt: null },
                orderBy: { startsOn: 'desc' },
            }),
            this.db.position.findUnique({ where: { id: ctx.positionId } }),
            this.db.person.findUnique({ where: { id: ctx.personId } }),
        ]);
        if (!user || !school || !position || !person) {
            throw new HttpException(
                'school.error.membershipInvalid',
                HttpStatus.FORBIDDEN
            );
        }
        const permissions =
            ctx.permissions === 'all'
                ? 'all'
                : ctx.permissions.length > 0
                  ? ctx.permissions
                  : permissionsForRole(prismaRoleToCatalog(position.baseRole));
        return {
            user: {
                id: user.id,
                name:
                    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                    user.userName,
                phone: user.phone,
                username: user.userName,
                role: prismaRoleToCatalog(position.baseRole),
                positionId: position.id,
                permissions,
                schoolId: school.id,
                schoolName: school.name,
            },
            person,
            school: {
                id: school.id,
                name: school.name,
                city: school.city,
                moneyUnit: school.moneyUnit.toLowerCase(),
                settings: school.settings,
            },
            years: years.map(year => ({
                id: year.id,
                label: year.label,
                active: year.isActive,
            })),
            yearId: ctx.yearId,
        };
    }

    async getInvitation(token: string) {
        const invitation = await this.findInvitation(token);
        const school = await this.db.school.findUnique({
            where: { id: invitation.schoolId },
        });
        const position = await this.db.position.findUnique({
            where: { id: invitation.positionId },
        });
        return {
            schoolName: school?.name ?? '',
            positionName: position?.name ?? '',
            phone: invitation.phone,
            expiresAt: invitation.expiresAt,
        };
    }

    async acceptInvitation(token: string, password: string) {
        const invitation = await this.findInvitation(token);
        if (invitation.acceptedAt) {
            throw new HttpException(
                'school.error.invitationUsed',
                HttpStatus.CONFLICT
            );
        }
        let user = await this.userRepository.findByPhone(invitation.phone);
        if (!user) {
            const passwordHash = await argon2.hash(password);
            user = await this.userRepository.create({
                phone: invitation.phone,
                userName: `u${randomBytes(6).toString('hex')}`,
                password: passwordHash,
                role: UserRole.MEMBER,
                isVerified: true,
            });
        } else {
            const passwordHash = await argon2.hash(password);
            user = await this.userRepository.update(user.id, {
                passwordHash,
                isVerified: true,
            });
        }
        await this.db.$transaction([
            this.db.invitation.update({
                where: { id: invitation.id },
                data: { acceptedAt: new Date() },
            }),
            this.db.person.update({
                where: { id: invitation.personId },
                data: { userId: user.id, status: 'ACTIVE' },
            }),
            this.db.schoolMembership.upsert({
                where: {
                    schoolId_userId: {
                        schoolId: invitation.schoolId,
                        userId: user.id,
                    },
                },
                update: {
                    status: MembershipStatus.ACTIVE,
                    positionId: invitation.positionId,
                    personId: invitation.personId,
                },
                create: {
                    schoolId: invitation.schoolId,
                    userId: user.id,
                    personId: invitation.personId,
                    positionId: invitation.positionId,
                    status: MembershipStatus.ACTIVE,
                },
            }),
        ]);
        const tokens = await this.authService.login({
            identifier: invitation.phone,
            password,
        });
        return tokens;
    }

    hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async findInvitation(token: string) {
        const invitation = await this.db.invitation.findUnique({
            where: { tokenHash: this.hashToken(token) },
        });
        if (!invitation || invitation.expiresAt < new Date()) {
            throw new HttpException(
                'school.error.invitationInvalid',
                HttpStatus.NOT_FOUND
            );
        }
        return invitation;
    }
}
