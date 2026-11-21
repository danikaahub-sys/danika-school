import { getQueueToken } from '@nestjs/bullmq';
import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BaseRole, MessageChannel } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { SchoolCommsService } from 'src/modules/school/comms/school-comms.service';

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

describe('SchoolCommsService', () => {
    let service: SchoolCommsService;
    const db: Record<string, Record<string, jest.Mock>> = {
        announcement: { findMany: jest.fn(), create: jest.fn() },
        messageTemplate: {
            findMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        person: { findMany: jest.fn() },
        enrollment: { findMany: jest.fn() },
        schoolMembership: { findMany: jest.fn() },
        messageDelivery: {
            createMany: jest.fn(),
            findMany: jest.fn(),
            updateMany: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const queue = { add: jest.fn() };

    beforeEach(async () => {
        db.$transaction.mockImplementation((ops: unknown) =>
            Promise.all(ops as Promise<unknown>[])
        );
        const module = await Test.createTestingModule({
            providers: [
                SchoolCommsService,
                { provide: DatabaseService, useValue: db },
                { provide: getQueueToken('sms'), useValue: queue },
            ],
        }).compile();
        service = module.get(SchoolCommsService);
    });

    it('lists announcements and templates', async () => {
        db.announcement.findMany.mockResolvedValue([]);
        db.messageTemplate.findMany.mockResolvedValue([]);
        await service.announcements(ctx);
        await service.templates(ctx);
        db.messageTemplate.create.mockResolvedValue({});
        await service.createTemplate(ctx, {
            title: 't',
            body: 'b',
            channel: MessageChannel.SMS,
        });
        db.messageTemplate.findFirst.mockResolvedValue(null);
        await expect(service.updateTemplate(ctx, 'x', {})).rejects.toThrow(
            HttpException
        );
        db.messageTemplate.findFirst.mockResolvedValue({ id: 't' });
        db.messageTemplate.update.mockResolvedValue({});
        await service.updateTemplate(ctx, 't', { title: 'n' });
    });

    it('resolves audiences and sends announcements', async () => {
        db.person.findMany.mockResolvedValue([{ id: 'p1' }]);
        await expect(
            service.resolveAudience(ctx, { all: true })
        ).resolves.toEqual(['p1']);
        db.enrollment.findMany.mockResolvedValue([{ studentId: 'st' }]);
        await expect(
            service.resolveAudience(ctx, { classIds: ['c'] })
        ).resolves.toEqual(['st']);
        await expect(
            service.resolveAudience(ctx, { gradeIds: ['g'] })
        ).resolves.toEqual(['st']);
        db.person.findMany.mockResolvedValue([{ id: 'k' }]);
        db.schoolMembership.findMany.mockResolvedValue([{ personId: 'm' }]);
        const ids = await service.resolveAudience(ctx, {
            roles: ['STUDENT', 'TEACHER'],
        });
        expect(ids).toEqual(expect.arrayContaining(['k', 'm']));
        await expect(service.resolveAudience(ctx, {})).resolves.toEqual([]);
        db.announcement.create.mockResolvedValue({ id: 'a' });
        db.person.findMany.mockResolvedValue([]);
        await expect(
            service.sendAnnouncement(ctx, {
                title: 't',
                body: 'b',
                channel: MessageChannel.SMS,
                audience: { all: true },
            })
        ).resolves.toEqual({ announcement: { id: 'a' }, queued: 0 });
        db.person.findMany.mockResolvedValue([{ id: 'p1' }]);
        db.messageDelivery.findMany.mockResolvedValue([
            { id: 'd1', person: { phone: '0912' } },
            { id: 'd2', person: { phone: null } },
        ]);
        await service.sendAnnouncement(ctx, {
            title: 't',
            body: 'b',
            channel: MessageChannel.BOTH,
            audience: { all: true },
        });
        expect(queue.add).toHaveBeenCalled();
        await service.sendAnnouncement(ctx, {
            title: 't',
            body: 'b',
            channel: MessageChannel.APP,
            audience: { all: true },
        });
        expect(db.messageDelivery.updateMany).toHaveBeenCalled();
    });

    it('lists deliveries', async () => {
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.deliveries(ctx, { page: 1, limit: 20 });
    });
});
