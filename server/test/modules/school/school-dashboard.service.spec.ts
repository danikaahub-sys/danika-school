import { Test } from '@nestjs/testing';
import { BaseRole } from '@prisma/client';

import { CacheService } from 'src/common/cache/services/cache.service';
import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { ScopeService } from 'src/modules/school/access/scope.service';
import { SchoolDashboardService } from 'src/modules/school/dashboard/school-dashboard.service';

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

describe('SchoolDashboardService', () => {
    let service: SchoolDashboardService;
    const db: Record<string, Record<string, jest.Mock>> = {
        teachingSession: {
            count: jest.fn(),
            findMany: jest.fn(),
            groupBy: jest.fn(),
        },
        receipt: {
            count: jest.fn(),
            findMany: jest.fn(),
            aggregate: jest.fn(),
        },
        mark: { count: jest.fn(), findMany: jest.fn() },
        importJob: { count: jest.fn() },
        guardianLink: { count: jest.fn() },
        homework: { findMany: jest.fn(), count: jest.fn() },
        announcement: { findMany: jest.fn(), count: jest.fn() },
        attendanceRecord: { findMany: jest.fn(), groupBy: jest.fn() },
        staffAttendance: { groupBy: jest.fn() },
        schoolClass: { findMany: jest.fn(), count: jest.fn() },
        enrollment: { count: jest.fn() },
        person: { count: jest.fn() },
    };
    const cache = { get: jest.fn(), set: jest.fn() };
    const scope = { classIds: jest.fn(), academicStudentIds: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                SchoolDashboardService,
                { provide: DatabaseService, useValue: db },
                { provide: CacheService, useValue: cache },
                { provide: ScopeService, useValue: scope },
            ],
        }).compile();
        service = module.get(SchoolDashboardService);
    });

    it('returns attention counts', async () => {
        db.teachingSession.count.mockResolvedValue(2);
        db.receipt.count.mockResolvedValue(1);
        db.mark.count.mockResolvedValue(3);
        db.importJob.count.mockResolvedValue(0);
        db.guardianLink.count.mockResolvedValue(4);
        await expect(service.attention(ctx)).resolves.toEqual({
            attendance: 2,
            receipts: 1,
            grades: 1,
            importErrors: 0,
            guardians: 4,
        });
        db.mark.count.mockResolvedValue(0);
        await expect(service.attention(ctx)).resolves.toEqual(
            expect.objectContaining({ grades: 0 })
        );
    });

    it('builds home for teacher and others', async () => {
        scope.classIds.mockResolvedValue(['c']);
        scope.academicStudentIds.mockResolvedValue(['st']);
        db.teachingSession.count.mockResolvedValue(0);
        db.receipt.count.mockResolvedValue(0);
        db.mark.count.mockResolvedValue(0);
        db.importJob.count.mockResolvedValue(0);
        db.guardianLink.count.mockResolvedValue(0);
        db.teachingSession.findMany.mockResolvedValue([]);
        db.homework.findMany.mockResolvedValue([]);
        db.announcement.findMany.mockResolvedValue([]);
        db.mark.findMany.mockResolvedValue([]);
        db.schoolClass.findMany.mockResolvedValue([
            {
                id: 'c',
                name: 'الف',
                gradeId: 'g',
                grade: { name: 'هفتم' },
            },
        ]);
        await service.home({ ...ctx, baseRole: BaseRole.TEACHER });
        scope.classIds.mockResolvedValue(['c']);
        scope.academicStudentIds.mockResolvedValue(['st']);
        await service.home({ ...ctx, baseRole: BaseRole.STUDENT });
        scope.classIds.mockResolvedValue(null);
        scope.academicStudentIds.mockResolvedValue(null);
        await service.home(ctx);
        db.schoolClass.findMany.mockResolvedValue([]);
        await service.home(ctx);
    });

    it('caches chart series', async () => {
        cache.get.mockResolvedValue([{ period: 'cached' }]);
        await expect(service.attendanceSeries(ctx, 'day')).resolves.toEqual([
            { period: 'cached' },
        ]);
        cache.get.mockResolvedValue(null);
        db.attendanceRecord.findMany.mockResolvedValue([
            {
                status: 'PRESENT',
                session: { date: new Date('2026-01-05') },
            },
            {
                status: 'ABSENT',
                session: { date: new Date('2026-01-05') },
            },
        ]);
        await service.attendanceSeries(ctx, 'day');
        await service.attendanceSeries(ctx, 'week');
        await service.attendanceSeries(ctx, 'month');
        db.attendanceRecord.findMany.mockResolvedValue([]);
        await service.attendanceSeries(ctx, 'day');
        db.receipt.findMany.mockResolvedValue([
            { date: new Date('2026-01-01'), amountIrr: 5n },
        ]);
        await service.collectionsSeries(ctx);
        db.mark.findMany.mockResolvedValue([
            { earned: 19, assessment: { maximum: 20 } },
            { earned: 16, assessment: { maximum: 20 } },
            { earned: 14, assessment: { maximum: 20 } },
            { earned: 12, assessment: { maximum: 20 } },
            { earned: 5, assessment: { maximum: 20 } },
            { earned: 1, assessment: { maximum: 0 } },
        ]);
        const dist = await service.gradeDistribution(ctx);
        expect(dist).toEqual({ A: 1, B: 1, C: 1, D: 1, F: 2 });
        db.schoolClass.findMany.mockResolvedValue([
            {
                id: 'c',
                name: 'الف',
                grade: { name: 'هفتم' },
                _count: { enrollments: 23 },
            },
        ]);
        await expect(service.enrollmentSeries(ctx)).resolves.toEqual([
            { classId: 'c', label: 'هفتم الف', count: 23 },
        ]);
    });

    it('builds overview with zero attendance rate when unmarked only', async () => {
        cache.get.mockResolvedValue(null);
        db.enrollment.count.mockResolvedValue(120);
        db.person.count.mockResolvedValue(18);
        db.schoolClass.count.mockResolvedValue(6);
        db.attendanceRecord.groupBy.mockResolvedValue([
            { status: 'UNMARKED', _count: { _all: 40 } },
        ]);
        db.teachingSession.groupBy.mockResolvedValue([
            { status: 'SCHEDULED', _count: { _all: 5 } },
            { status: 'SUBMITTED', _count: { _all: 2 } },
        ]);
        db.staffAttendance.groupBy.mockResolvedValue([
            { status: 'PRESENT', _count: { _all: 10 } },
            { status: 'ABSENT', _count: { _all: 1 } },
        ]);
        db.receipt.aggregate.mockResolvedValue({
            _sum: { amountIrr: 0n },
            _count: { _all: 0 },
        });
        db.homework.count.mockResolvedValue(3);
        db.announcement.count.mockResolvedValue(1);
        db.attendanceRecord.findMany.mockResolvedValue([]);
        db.receipt.findMany.mockResolvedValue([]);

        const result = await service.overview(ctx, 'day');
        expect(result.attendance.rate).toBe(0);
        expect(result.attendance.prevRate).toBe(0);
        expect(result.headcount).toEqual({
            students: 120,
            staff: 18,
            classes: 6,
        });
        expect(result.sessions).toEqual(
            expect.objectContaining({
                total: 7,
                submitted: 2,
                pending: 5,
            })
        );
        expect(result.staff).toEqual({ present: 10, absent: 1 });
        expect(result.finance.collectedIrr).toBe('0');
        expect(result.trend.length).toBe(7);
        expect(cache.set).toHaveBeenCalled();
    });

    it('computes attendance rate from marked rows and ranks absences', async () => {
        cache.get.mockResolvedValue(null);
        db.enrollment.count.mockResolvedValue(0);
        db.person.count.mockResolvedValue(0);
        db.schoolClass.count.mockResolvedValue(0);
        db.attendanceRecord.groupBy
            .mockResolvedValueOnce([
                { status: 'PRESENT', _count: { _all: 8 } },
                { status: 'ABSENT', _count: { _all: 2 } },
            ])
            .mockResolvedValueOnce([
                { status: 'PRESENT', _count: { _all: 5 } },
                { status: 'ABSENT', _count: { _all: 5 } },
            ]);
        db.teachingSession.groupBy.mockResolvedValue([]);
        db.staffAttendance.groupBy.mockResolvedValue([]);
        db.receipt.aggregate.mockResolvedValue({
            _sum: { amountIrr: 150000n },
            _count: { _all: 2 },
        });
        db.homework.count.mockResolvedValue(0);
        db.announcement.count.mockResolvedValue(0);
        db.attendanceRecord.findMany
            .mockResolvedValueOnce([
                {
                    session: {
                        assignment: {
                            class: {
                                id: 'c1',
                                name: 'الف',
                                grade: { name: 'هفتم' },
                            },
                        },
                    },
                },
                {
                    session: {
                        assignment: {
                            class: {
                                id: 'c1',
                                name: 'الف',
                                grade: { name: 'هفتم' },
                            },
                        },
                    },
                },
                {
                    session: {
                        assignment: {
                            class: {
                                id: 'c2',
                                name: 'ب',
                                grade: { name: 'هشتم' },
                            },
                        },
                    },
                },
            ])
            .mockResolvedValueOnce([]);
        db.receipt.findMany.mockResolvedValue([]);

        const result = await service.overview(ctx, 'week');
        expect(result.attendance.rate).toBe(80);
        expect(result.attendance.prevRate).toBe(50);
        expect(result.attendance.absent).toBe(2);
        expect(result.absencesByClass).toEqual([
            { classId: 'c1', label: 'هفتم الف', absent: 2 },
            { classId: 'c2', label: 'هشتم ب', absent: 1 },
        ]);
        expect(result.finance.collectedIrr).toBe('150000');
    });
});
