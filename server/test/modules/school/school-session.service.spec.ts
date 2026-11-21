import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MembershipStatus, BaseRole } from '@prisma/client';
import * as argon2 from 'argon2';

import { UserRole } from 'src/common/database/enums/role.enum';
import { UserRepository } from 'src/common/database/repositories/user.repository';
import { DatabaseService } from 'src/common/database/services/database.service';
import { AuthService } from 'src/modules/auth/services/auth.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { SchoolSessionService } from 'src/modules/school/session/school-session.service';

jest.mock('argon2', () => ({ hash: jest.fn(), verify: jest.fn() }));

const ctx: SchoolContext = {
    userId: 'u1',
    schoolId: 's1',
    membershipId: 'm1',
    personId: 'p1',
    positionId: 'pos',
    baseRole: BaseRole.PRINCIPAL,
    permissions: 'all',
    permVersion: 1,
    yearId: 'y1',
};

describe('SchoolSessionService', () => {
    let service: SchoolSessionService;
    const db = {
        schoolMembership: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        school: { findUnique: jest.fn() },
        academicYear: { findMany: jest.fn() },
        position: { findUnique: jest.fn() },
        person: { findUnique: jest.fn(), update: jest.fn() },
        invitation: { findUnique: jest.fn(), update: jest.fn() },
        $transaction: jest.fn(),
    };
    const authService = {
        issueSchoolAccessToken: jest.fn(),
        login: jest.fn(),
    };
    const userRepository = {
        findById: jest.fn(),
        findByPhone: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                SchoolSessionService,
                { provide: DatabaseService, useValue: db },
                { provide: AuthService, useValue: authService },
                { provide: UserRepository, useValue: userRepository },
            ],
        }).compile();
        service = module.get(SchoolSessionService);
    });

    it('lists memberships', async () => {
        db.schoolMembership.findMany.mockResolvedValue([
            {
                id: 'm',
                schoolId: 's',
                school: { name: 'N', city: 'C' },
                position: { baseRole: 'TEACHER', name: 'T' },
                status: 'ACTIVE',
            },
        ]);
        await expect(service.listMemberships('u')).resolves.toEqual([
            expect.objectContaining({ schoolName: 'N', city: 'C' }),
        ]);
    });

    it('creates a school session', async () => {
        db.schoolMembership.findUnique.mockResolvedValue(null);
        await expect(service.createSession('u', 's')).rejects.toThrow(
            HttpException
        );
        db.schoolMembership.findUnique.mockResolvedValue({
            id: 'm',
            status: MembershipStatus.INVITED,
            user: { role: UserRole.MEMBER },
            position: {},
        });
        await expect(service.createSession('u', 's')).rejects.toThrow(
            HttpException
        );
        db.schoolMembership.findUnique.mockResolvedValue({
            id: 'm',
            status: MembershipStatus.ACTIVE,
            permVersion: 1,
            user: { role: UserRole.MEMBER },
            position: {},
        });
        authService.issueSchoolAccessToken.mockResolvedValue('tok');
        await expect(service.createSession('u', 's')).resolves.toEqual({
            accessToken: 'tok',
            schoolId: 's',
            membershipId: 'm',
        });
    });

    it('builds me payload', async () => {
        userRepository.findById.mockResolvedValue(null);
        await expect(service.me(ctx)).rejects.toThrow(HttpException);
        userRepository.findById.mockResolvedValue({
            id: 'u1',
            firstName: 'A',
            lastName: 'B',
            userName: 'ab',
            phone: '09',
        });
        db.school.findUnique.mockResolvedValue({
            id: 's1',
            name: 'School',
            city: 'T',
            moneyUnit: 'TOMAN',
            settings: {},
        });
        db.academicYear.findMany.mockResolvedValue([
            { id: 'y1', label: '1405', isActive: true },
        ]);
        db.position.findUnique.mockResolvedValue({
            id: 'pos',
            baseRole: 'PRINCIPAL',
        });
        db.person.findUnique.mockResolvedValue({ id: 'p1' });
        await expect(service.me(ctx)).resolves.toEqual(
            expect.objectContaining({ yearId: 'y1' })
        );
        await expect(service.me({ ...ctx, permissions: [] })).resolves.toEqual(
            expect.objectContaining({ yearId: 'y1' })
        );
        await expect(
            service.me({
                ...ctx,
                permissions: ['home.dashboard.view'],
            })
        ).resolves.toEqual(expect.objectContaining({ yearId: 'y1' }));
        userRepository.findById.mockResolvedValue({
            id: 'u1',
            firstName: null,
            lastName: null,
            userName: 'ab',
        });
        await expect(service.me(ctx)).resolves.toEqual(
            expect.objectContaining({
                user: expect.objectContaining({ name: 'ab' }),
            })
        );
    });

    it('previews and accepts invitations', async () => {
        db.invitation.findUnique.mockResolvedValue(null);
        await expect(service.getInvitation('tok')).rejects.toThrow(
            HttpException
        );
        const invitation = {
            id: 'i',
            schoolId: 's1',
            positionId: 'pos',
            personId: 'p1',
            phone: '0912',
            acceptedAt: null,
            expiresAt: new Date(Date.now() + 10000),
        };
        db.invitation.findUnique.mockResolvedValue(invitation);
        db.school.findUnique.mockResolvedValue({ name: 'N' });
        db.position.findUnique.mockResolvedValue({ name: 'P' });
        await expect(service.getInvitation('tok')).resolves.toEqual(
            expect.objectContaining({ schoolName: 'N', positionName: 'P' })
        );
        db.school.findUnique.mockResolvedValue(null);
        db.position.findUnique.mockResolvedValue(null);
        await expect(service.getInvitation('tok')).resolves.toEqual(
            expect.objectContaining({ schoolName: '', positionName: '' })
        );
        db.invitation.findUnique.mockResolvedValue({
            ...invitation,
            expiresAt: new Date(0),
        });
        await expect(service.getInvitation('tok')).rejects.toThrow(
            HttpException
        );
        db.invitation.findUnique.mockResolvedValue({
            ...invitation,
            acceptedAt: new Date(),
        });
        await expect(
            service.acceptInvitation('tok', 'Password1!')
        ).rejects.toThrow(HttpException);
        db.invitation.findUnique.mockResolvedValue(invitation);
        (argon2.hash as jest.Mock).mockResolvedValue('h');
        userRepository.findByPhone.mockResolvedValue(null);
        userRepository.create.mockResolvedValue({ id: 'u' });
        db.$transaction.mockResolvedValue([]);
        authService.login.mockResolvedValue({ accessToken: 'a' });
        await expect(
            service.acceptInvitation('tok', 'Password1!')
        ).resolves.toEqual({ accessToken: 'a' });
        userRepository.findByPhone.mockResolvedValue({ id: 'u' });
        userRepository.update.mockResolvedValue({ id: 'u' });
        await service.acceptInvitation('tok', 'Password1!');
        expect(userRepository.update).toHaveBeenCalled();
    });
});
