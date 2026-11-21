import { getQueueToken } from '@nestjs/bullmq';
import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PersonKind, BaseRole } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { ScopeService } from 'src/modules/school/access/scope.service';
import { SchoolPeopleService } from 'src/modules/school/people/school-people.service';

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

describe('SchoolPeopleService', () => {
    let service: SchoolPeopleService;
    const db: Record<string, Record<string, jest.Mock>> = {
        person: {
            findMany: jest.fn(),
            count: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        enrollment: { create: jest.fn(), upsert: jest.fn() },
        guardianLink: {
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        importJob: { create: jest.fn(), findFirst: jest.fn() },
        $transaction: jest.fn(),
    };
    const scope = { studentIds: jest.fn() };
    const queue = { add: jest.fn() };

    beforeEach(async () => {
        db.$transaction.mockImplementation(async (arg: unknown) => {
            if (typeof arg === 'function') {
                return (arg as (tx: typeof db) => Promise<unknown>)(db);
            }
            return arg;
        });
        const module = await Test.createTestingModule({
            providers: [
                SchoolPeopleService,
                { provide: DatabaseService, useValue: db },
                { provide: ScopeService, useValue: scope },
                { provide: getQueueToken('import'), useValue: queue },
            ],
        }).compile();
        service = module.get(SchoolPeopleService);
    });

    it('lists people with filters', async () => {
        scope.studentIds.mockResolvedValue(null);
        db.person.findMany.mockResolvedValue([]);
        db.person.count.mockResolvedValue(0);
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.list(ctx, PersonKind.STUDENT, { page: 1, limit: 20 });
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.list(ctx, undefined, { page: 1, limit: 20 });
        scope.studentIds.mockResolvedValue(['p']);
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.list(ctx, PersonKind.STUDENT, {
            page: 1,
            limit: 20,
            search: 'علی',
            classId: 'c1',
        });
        expect(db.person.findMany).toHaveBeenCalled();
    });

    it('details, creates, updates, archives', async () => {
        db.person.findFirst.mockResolvedValue(null);
        await expect(service.detail(ctx, 'x')).rejects.toThrow(HttpException);
        db.person.findFirst.mockResolvedValue({
            id: 'p',
            firstName: 'A',
            lastName: 'B',
            enrollments: [{ class: { name: 'الف', grade: { name: 'هفتم' } } }],
            guardianAsGuardian: [{ id: 'g', verifiedAt: new Date() }],
            guardianAsStudent: [{ id: 'l', verifiedAt: null }],
            attendance: [],
            marks: [
                {
                    earned: 10,
                    assessment: { title: 't', maximum: 20, weight: 1 },
                },
            ],
            charges: [],
        });
        await expect(service.detail(ctx, 'p')).resolves.toEqual(
            expect.objectContaining({ className: 'هفتم الف' })
        );
        db.person.findFirst.mockResolvedValue({
            id: 'p',
            firstName: 'A',
            lastName: 'B',
            enrollments: [{ class: { name: 'الف' } }],
            guardianAsGuardian: [],
            guardianAsStudent: [],
            attendance: [],
            marks: [
                {
                    earned: null,
                    assessment: { title: 't', maximum: 20, weight: 1 },
                },
            ],
            charges: [],
        });
        await expect(service.detail(ctx, 'p')).resolves.toEqual(
            expect.objectContaining({ className: 'الف' })
        );
        db.person.findFirst.mockResolvedValue({
            id: 'p',
            firstName: 'A',
            lastName: 'B',
            enrollments: [],
            guardianAsGuardian: [],
            guardianAsStudent: [],
            attendance: [],
            marks: [],
            charges: [],
        });
        await expect(service.detail(ctx, 'p')).resolves.toEqual(
            expect.objectContaining({ className: '' })
        );
        db.person.create.mockResolvedValue({ id: 'n' });
        await service.create(ctx, {
            kind: PersonKind.STAFF,
            firstName: 'A',
            lastName: 'B',
        });
        await service.create(ctx, {
            kind: PersonKind.STUDENT,
            firstName: 'A',
            lastName: 'B',
            classId: 'c',
        });
        db.person.update.mockResolvedValue({ id: 'p' });
        await service.update(ctx, 'p', { firstName: 'C' });
        await service.update(ctx, 'p', { classId: 'c' });
        await service.archive(ctx, 'p');
        expect(db.person.update).toHaveBeenCalled();
    });

    it('manages guardian links and import jobs', async () => {
        db.guardianLink.create.mockResolvedValue({ id: 'l' });
        await service.createLink(ctx, {
            guardianId: 'g',
            studentId: 's',
            relation: 'پدر',
        });
        db.guardianLink.findFirst.mockResolvedValue(null);
        await expect(service.verifyLink(ctx, 'l')).rejects.toThrow(
            HttpException
        );
        await expect(
            service.setLinkVisibility(ctx, 'l', { academicVisible: false })
        ).rejects.toThrow(HttpException);
        db.guardianLink.findFirst.mockResolvedValue({ id: 'l' });
        db.guardianLink.update.mockResolvedValue({ id: 'l' });
        await service.verifyLink(ctx, 'l');
        await service.setLinkVisibility(ctx, 'l', { financialVisible: false });
        db.importJob.create.mockResolvedValue({ id: 'job' });
        await service.enqueueImport(ctx, 'csv');
        expect(queue.add).toHaveBeenCalled();
        db.importJob.findFirst.mockResolvedValue({ id: 'job' });
        await service.getImport(ctx, 'job');
    });
});
