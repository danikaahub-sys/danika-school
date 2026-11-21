import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BaseRole } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { SchoolContextService } from 'src/modules/school/access/school-context.service';
import { SchoolAdminService } from 'src/modules/school/admin/school-admin.service';
import { SchoolSessionService } from 'src/modules/school/session/school-session.service';

const ctx: SchoolContext = {
    userId: 'u',
    schoolId: 's',
    membershipId: 'm',
    personId: 'p',
    positionId: 'pos',
    baseRole: BaseRole.PRINCIPAL,
    permissions: 'all',
    permVersion: 1,
    yearId: 'y',
};

describe('SchoolAdminService', () => {
    let service: SchoolAdminService;
    const db: Record<string, Record<string, jest.Mock>> = {
        schoolMembership: {
            findMany: jest.fn(),
            count: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        position: {
            findMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        invitation: {
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        auditLog: { findMany: jest.fn(), count: jest.fn() },
        school: { findUnique: jest.fn(), update: jest.fn() },
        schoolSettings: { upsert: jest.fn() },
        $transaction: jest.fn(),
    };
    const schoolContextService = { bumpPermVersion: jest.fn() };
    const sessionService = { hashToken: jest.fn().mockReturnValue('hash') };

    beforeEach(async () => {
        db.$transaction.mockImplementation((ops: unknown) =>
            Promise.all(ops as Promise<unknown>[])
        );
        const module = await Test.createTestingModule({
            providers: [
                SchoolAdminService,
                { provide: DatabaseService, useValue: db },
                {
                    provide: SchoolContextService,
                    useValue: schoolContextService,
                },
                { provide: SchoolSessionService, useValue: sessionService },
            ],
        }).compile();
        service = module.get(SchoolAdminService);
    });

    it('lists users, positions, audit and settings', async () => {
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.users(ctx, { page: 1, limit: 20 });
        db.position.findMany.mockResolvedValue([]);
        await service.positions(ctx);
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.audit(ctx, { page: 1, limit: 20 });
        db.school.findUnique.mockResolvedValue({ id: 's' });
        await service.settings(ctx);
    });

    it('creates and updates positions', async () => {
        db.position.create.mockResolvedValue({ id: 'p' });
        await service.createPosition(ctx, {
            name: 'معلم',
            baseRole: BaseRole.TEACHER,
        });
        await service.createPosition(ctx, {
            name: 'X',
            baseRole: BaseRole.PRINCIPAL,
            permissions: ['home.dashboard.view'],
        });
        db.position.findFirst.mockResolvedValue(null);
        await expect(service.updatePosition(ctx, 'x', {})).rejects.toThrow(
            HttpException
        );
        db.position.findFirst.mockResolvedValue({ id: 'p' });
        db.position.update.mockResolvedValue({ id: 'p' });
        await service.updatePosition(ctx, 'p', { name: 'n', isAll: true });
        expect(schoolContextService.bumpPermVersion).toHaveBeenCalled();
    });

    it('invites, resends and deactivates', async () => {
        db.invitation.create.mockResolvedValue({ id: 'i' });
        const invite = await service.invite(ctx, {
            phone: '0912',
            positionId: 'pos',
            personId: 'p',
        });
        expect(invite.token).toBeDefined();
        db.invitation.findFirst.mockResolvedValue(null);
        await expect(service.resendInvite(ctx, 'i')).rejects.toThrow(
            HttpException
        );
        db.invitation.findFirst.mockResolvedValue({ id: 'i' });
        db.invitation.update.mockResolvedValue({});
        await service.resendInvite(ctx, 'i');
        db.schoolMembership.findFirst.mockResolvedValue(null);
        await expect(service.deactivate(ctx, 'm')).rejects.toThrow(
            HttpException
        );
        db.schoolMembership.findFirst.mockResolvedValue({ id: 'm' });
        db.schoolMembership.update.mockResolvedValue({});
        await service.deactivate(ctx, 'm');
    });

    it('updates settings optionally with sms sender', async () => {
        db.school.update.mockResolvedValue({ id: 's' });
        await service.updateSettings(ctx, { name: 'n' });
        await service.updateSettings(ctx, { smsSender: 'D' });
        expect(db.schoolSettings.upsert).toHaveBeenCalled();
    });
});
