import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BaseRole } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { SchoolSetupService } from 'src/modules/school/setup/school-setup.service';

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

describe('SchoolSetupService', () => {
    let service: SchoolSetupService;
    const db: Record<string, Record<string, jest.Mock>> = {
        academicYear: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        grade: { findMany: jest.fn(), create: jest.fn() },
        schoolClass: { findMany: jest.fn(), create: jest.fn() },
        subject: { findMany: jest.fn(), create: jest.fn() },
        teachingAssignment: { findMany: jest.fn(), create: jest.fn() },
        bellPeriod: { findMany: jest.fn(), create: jest.fn() },
        timetableSlot: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        closure: { findMany: jest.fn(), create: jest.fn() },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        db.$transaction.mockImplementation(async (arg: unknown) => {
            if (typeof arg === 'function') {
                return (arg as (tx: typeof db) => Promise<unknown>)(db);
            }
            return arg;
        });
        const module = await Test.createTestingModule({
            providers: [
                SchoolSetupService,
                { provide: DatabaseService, useValue: db },
            ],
        }).compile();
        service = module.get(SchoolSetupService);
    });

    it('returns a setup bundle', async () => {
        db.academicYear.findMany.mockResolvedValue([
            { id: 'y', label: 'L', isActive: true, startsOn: new Date() },
        ]);
        db.grade.findMany.mockResolvedValue([]);
        db.schoolClass.findMany.mockResolvedValue([]);
        db.subject.findMany.mockResolvedValue([]);
        db.teachingAssignment.findMany.mockResolvedValue([
            {
                id: 'a',
                classId: 'c',
                subjectId: 's',
                teacherPersonId: 't',
                teacher: { firstName: 'A', lastName: 'B' },
            },
            {
                id: 'b',
                classId: 'c',
                subjectId: 's',
                teacherPersonId: 't2',
            },
        ]);
        db.bellPeriod.findMany.mockResolvedValue([
            { id: 'p', name: '1', startTime: '07:00', endTime: '07:45' },
        ]);
        db.timetableSlot.findMany.mockResolvedValue([
            {
                classId: 'c',
                day: 1,
                periodId: 'p',
                assignment: { subjectId: 's', teacherPersonId: 't' },
            },
        ]);
        db.closure.findMany.mockResolvedValue([]);
        const bundle = await service.bundle(ctx);
        expect(bundle.years[0].active).toBe(true);
        expect(bundle.assignments[0].teacherId).toBe('t');
        expect(bundle.periods[0].start).toBe('07:00');
        expect(bundle.timetable[0].day).toBe(1);
    });

    it('creates year, grade, class, subject, assignment, period, closure', async () => {
        db.academicYear.create.mockResolvedValue({ id: 'y' });
        await service.createYear(ctx, {
            label: 'L',
            startsOn: '2026-01-01',
            endsOn: '2026-12-01',
        });
        db.grade.create.mockResolvedValue({});
        await service.createGrade(ctx, 'هفتم');
        db.schoolClass.create.mockResolvedValue({});
        await service.createClass(ctx, { name: 'الف', gradeId: 'g' });
        db.subject.create.mockResolvedValue({});
        await service.createSubject(ctx, 'ریاضی');
        db.teachingAssignment.create.mockResolvedValue({});
        await service.createAssignment(ctx, {
            classId: 'c',
            subjectId: 's',
            teacherId: 't',
        });
        db.bellPeriod.create.mockResolvedValue({});
        await service.createPeriod(ctx, {
            name: '1',
            start: '07',
            end: '08',
        });
        await service.createPeriod(ctx, {
            name: '2',
            start: '08',
            end: '09',
            sortOrder: 2,
        });
        db.closure.create.mockResolvedValue({});
        await service.createClosure(ctx, { date: '2026-01-01', title: 'x' });
        expect(db.closure.create).toHaveBeenCalled();
    });

    it('activates a year', async () => {
        db.academicYear.findFirst.mockResolvedValue(null);
        await expect(service.activateYear(ctx, 'y')).rejects.toThrow(
            HttpException
        );
        db.academicYear.findFirst.mockResolvedValue({ id: 'y' });
        await expect(service.activateYear(ctx, 'y')).resolves.toEqual({
            success: true,
        });
    });

    it('rolls over classes and assignments', async () => {
        db.schoolClass.findMany.mockResolvedValue([
            { id: 'c1', gradeId: 'g', name: 'الف' },
        ]);
        db.teachingAssignment.findMany.mockResolvedValue([
            {
                classId: 'c1',
                subjectId: 's',
                teacherPersonId: 't',
            },
            { classId: 'missing', subjectId: 's', teacherPersonId: 't' },
        ]);
        db.academicYear.create.mockResolvedValue({ id: 'ny' });
        db.schoolClass.create.mockResolvedValue({ id: 'nc' });
        db.teachingAssignment.create.mockResolvedValue({});
        await service.rollover(ctx, {
            label: 'n',
            startsOn: '2027-01-01',
            endsOn: '2027-12-01',
        });
        expect(db.teachingAssignment.create).toHaveBeenCalled();
    });

    it('upserts timetable including empty slots', async () => {
        db.timetableSlot.createMany.mockResolvedValue({ count: 1 });
        await expect(service.upsertTimetable(ctx, [])).resolves.toEqual({
            count: 0,
        });
        await service.upsertTimetable(ctx, [
            {
                classId: 'c',
                day: 1,
                periodId: 'p',
                assignmentId: 'a',
            },
        ]);
        expect(db.timetableSlot.createMany).toHaveBeenCalled();
    });
});
