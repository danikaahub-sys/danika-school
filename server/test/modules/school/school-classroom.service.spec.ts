import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttendanceStatus, BaseRole, SessionStatus } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { ScopeService } from 'src/modules/school/access/scope.service';
import {
    dateOnly,
    iranianWeekday,
    SchoolClassroomService,
} from 'src/modules/school/classroom/school-classroom.service';

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

describe('SchoolClassroomService', () => {
    let service: SchoolClassroomService;
    const db: Record<string, Record<string, jest.Mock>> = {
        schoolClass: { findMany: jest.fn(), findFirst: jest.fn() },
        teachingSession: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        homework: {
            findMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        disciplineNote: { findMany: jest.fn(), create: jest.fn() },
        assessment: {
            findMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        attendanceRecord: { upsert: jest.fn() },
        staffAttendance: { findMany: jest.fn(), upsert: jest.fn() },
        mark: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
        academicYear: { findFirst: jest.fn() },
        closure: { findFirst: jest.fn() },
        timetableSlot: { findMany: jest.fn() },
        enrollment: { findMany: jest.fn() },
        $transaction: jest.fn(),
    };
    const scope = { classIds: jest.fn(), academicStudentIds: jest.fn() };

    beforeEach(async () => {
        db.$transaction.mockImplementation(async (arg: unknown) => {
            if (Array.isArray(arg)) return Promise.all(arg);
            return arg;
        });
        const module = await Test.createTestingModule({
            providers: [
                SchoolClassroomService,
                { provide: DatabaseService, useValue: db },
                { provide: ScopeService, useValue: scope },
            ],
        }).compile();
        service = module.get(SchoolClassroomService);
    });

    it('computes iranian weekdays and dateOnly', () => {
        expect(
            iranianWeekday(new Date('2026-11-21T00:00:00Z'))
        ).toBeGreaterThan(0);
        expect(
            dateOnly('2026-01-02').toISOString().startsWith('2026-01-02')
        ).toBe(true);
        expect(
            dateOnly(new Date('2026-01-02T15:00:00Z')).toISOString()
        ).toContain('2026-01-02');
    });

    it('lists classes and workspace', async () => {
        scope.classIds.mockResolvedValue(null);
        db.schoolClass.findMany.mockResolvedValue([]);
        await service.classes(ctx);
        scope.classIds.mockResolvedValue(['c']);
        await service.classes(ctx);
        scope.classIds.mockResolvedValue(['c']);
        db.schoolClass.findFirst.mockResolvedValue({ id: 'c' });
        db.teachingSession.findMany.mockResolvedValue([
            { attendance: [{ id: 'a' }], assignment: { subjectId: 's' } },
        ]);
        db.homework.findMany.mockResolvedValue([]);
        db.disciplineNote.findMany.mockResolvedValue([]);
        db.enrollment.findMany.mockResolvedValue([]);
        db.assessment.findMany.mockResolvedValue([
            {
                title: 't',
                maximum: 20,
                weight: 1,
                assignment: { subjectId: 's' },
                marks: [
                    { id: 'm', earned: 10 },
                    { id: 'm2', earned: null },
                ],
            },
        ]);
        const ws = await service.workspace(ctx, 'c');
        expect(ws.scores[0].subjectId).toBe('s');
        scope.classIds.mockResolvedValue(['other']);
        await expect(service.workspace(ctx, 'c')).rejects.toThrow(
            HttpException
        );
        scope.classIds.mockResolvedValue(null);
        db.schoolClass.findFirst.mockResolvedValue(null);
        await expect(service.workspace(ctx, 'c')).rejects.toThrow(
            HttpException
        );
    });

    it('school attendance and staff mark', async () => {
        scope.classIds.mockResolvedValue(null);
        db.teachingSession.findMany.mockResolvedValue([]);
        db.staffAttendance.findMany.mockResolvedValue([]);
        await service.schoolAttendance(ctx);
        scope.classIds.mockResolvedValue(['c']);
        db.teachingSession.findMany.mockResolvedValue([
            {
                attendance: [
                    { status: AttendanceStatus.ABSENT },
                    { status: AttendanceStatus.PRESENT },
                ],
            },
        ]);
        db.staffAttendance.findMany.mockResolvedValue([]);
        const result = await service.schoolAttendance(ctx);
        expect(result.followUp).toHaveLength(1);
        db.staffAttendance.upsert.mockResolvedValue({});
        await service.markStaff(ctx, {
            personId: 'p',
            date: '2026-01-01',
            status: AttendanceStatus.PRESENT,
        });
    });

    it('marks and submits sessions', async () => {
        db.teachingSession.findFirst.mockResolvedValue(null);
        await expect(service.markAttendance(ctx, 'se', [])).rejects.toThrow(
            HttpException
        );
        scope.classIds.mockResolvedValue(['c']);
        db.teachingSession.findFirst.mockResolvedValue({
            id: 'se',
            status: SessionStatus.SUBMITTED,
            assignment: { classId: 'other' },
        });
        await expect(service.markAttendance(ctx, 'se', [])).rejects.toThrow(
            HttpException
        );
        db.teachingSession.findFirst.mockResolvedValue({
            id: 'se',
            status: SessionStatus.SUBMITTED,
            assignment: { classId: 'c' },
        });
        await expect(service.markAttendance(ctx, 'se', [])).rejects.toThrow(
            HttpException
        );
        db.teachingSession.findFirst.mockResolvedValue({
            id: 'se',
            status: SessionStatus.SCHEDULED,
            assignment: { classId: 'c' },
        });
        await service.markAttendance(ctx, 'se', [
            { studentId: 'st', status: AttendanceStatus.PRESENT },
        ]);
        db.teachingSession.findFirst.mockResolvedValue({
            id: 'se',
            status: SessionStatus.DRAFT,
            assignment: { classId: 'c' },
        });
        await service.markAttendance(ctx, 'se', []);
        db.teachingSession.update.mockResolvedValue({});
        await service.submitSession(ctx, 'se');
        scope.classIds.mockResolvedValue(null);
        await service.submitSession(ctx, 'se');
    });

    it('homework, discipline, assessments, marks, report cards', async () => {
        db.homework.create.mockResolvedValue({});
        await service.createHomework(ctx, {
            classId: 'c',
            subjectId: 's',
            title: 't',
            dueOn: '2026-01-01',
        });
        db.homework.findFirst.mockResolvedValue(null);
        await expect(service.publishHomework(ctx, 'h')).rejects.toThrow(
            HttpException
        );
        db.homework.findFirst.mockResolvedValue({ id: 'h' });
        db.homework.update.mockResolvedValue({});
        await service.publishHomework(ctx, 'h');
        db.disciplineNote.create.mockResolvedValue({});
        await service.createDiscipline(ctx, {
            studentId: 'st',
            classId: 'c',
            title: 'n',
            date: '2026-01-01',
        });
        db.assessment.create.mockResolvedValue({});
        await service.createAssessment(ctx, {
            assignmentId: 'a',
            title: 't',
            maximum: 20,
            weight: 1,
        });
        db.assessment.findFirst.mockResolvedValue(null);
        await expect(service.saveMarks(ctx, 'a', [])).rejects.toThrow(
            HttpException
        );
        await expect(service.publishAssessment(ctx, 'a')).rejects.toThrow(
            HttpException
        );
        db.assessment.findFirst.mockResolvedValue({
            id: 'a',
            publishedAt: new Date(),
        });
        await expect(service.saveMarks(ctx, 'a', [])).rejects.toThrow(
            HttpException
        );
        db.assessment.findFirst.mockResolvedValue({
            id: 'a',
            publishedAt: null,
        });
        await service.saveMarks(ctx, 'a', [
            { studentId: 'st', earned: 10 },
            { studentId: 'st2', status: 'MISSING' },
        ]);
        await service.publishAssessment(ctx, 'a');
        scope.academicStudentIds.mockResolvedValue(['other']);
        await expect(service.reportCard(ctx, 'st')).rejects.toThrow(
            HttpException
        );
        scope.academicStudentIds.mockResolvedValue(null);
        db.mark.findMany.mockResolvedValue([]);
        await expect(service.reportCard(ctx, 'st')).resolves.toEqual(
            expect.objectContaining({ overall: 0 })
        );
        db.mark.findMany.mockResolvedValue([
            {
                earned: 10,
                assessment: {
                    maximum: 20,
                    weight: 1,
                    assignment: { subject: { id: 's', name: 'math' } },
                },
            },
            {
                earned: null,
                assessment: {
                    maximum: 0,
                    weight: 1,
                    assignment: { subject: { id: 'z', name: 'zero' } },
                },
            },
        ]);
        const card = await service.reportCard(ctx, 'st');
        expect(card.subjects[0].subject).toBe('math');
        scope.academicStudentIds.mockResolvedValue(null);
        scope.classIds.mockResolvedValue(null);
        db.mark.findMany.mockResolvedValue([]);
        await service.results(ctx);
        scope.academicStudentIds.mockResolvedValue(['st']);
        scope.classIds.mockResolvedValue(['c']);
        await service.results(ctx);
    });

    it('generates sessions from timetable', async () => {
        db.academicYear.findFirst.mockResolvedValue(null);
        await expect(service.generateForSchool('s')).resolves.toEqual({
            created: 0,
        });
        db.academicYear.findFirst.mockResolvedValue({ id: 'y' });
        db.closure.findFirst.mockResolvedValue({ id: 'cl' });
        await expect(service.generateForSchool('s')).resolves.toEqual({
            created: 0,
        });
        db.closure.findFirst.mockResolvedValue(null);
        db.timetableSlot.findMany.mockResolvedValue([
            { assignmentId: 'a', periodId: 'p' },
        ]);
        db.teachingSession.findFirst.mockResolvedValue({ id: 'ex' });
        await expect(service.generateForSchool('s')).resolves.toEqual({
            created: 0,
        });
        db.teachingSession.findFirst.mockResolvedValue(null);
        db.teachingSession.create.mockResolvedValue({});
        await expect(service.generateForSchool('s')).resolves.toEqual({
            created: 1,
        });
    });
});
