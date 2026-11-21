import { Test } from '@nestjs/testing';
import { BaseRole } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { ScopeService } from 'src/modules/school/access/scope.service';

const base: SchoolContext = {
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

describe('ScopeService', () => {
    let service: ScopeService;
    const db = {
        guardianLink: { findMany: jest.fn() },
        teachingAssignment: { findMany: jest.fn() },
        enrollment: { findMany: jest.fn(), findFirst: jest.fn() },
    };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ScopeService,
                { provide: DatabaseService, useValue: db },
            ],
        }).compile();
        service = module.get(ScopeService);
    });

    it('tenant merges schoolId', () => {
        expect(service.tenant(base, { x: 1 })).toEqual({
            schoolId: 's',
            x: 1,
        });
        expect(service.tenant(base)).toEqual({ schoolId: 's' });
    });

    it('studentIds is unbounded for managers', async () => {
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.PRINCIPAL })
        ).resolves.toBeNull();
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.DEPUTY })
        ).resolves.toBeNull();
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.FINANCE })
        ).resolves.toBeNull();
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.COUNSELOR })
        ).resolves.toBeNull();
    });

    it('student sees self, staff sees none', async () => {
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.STUDENT })
        ).resolves.toEqual(['p']);
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.STAFF })
        ).resolves.toEqual([]);
    });

    it('guardian sees verified links', async () => {
        db.guardianLink.findMany.mockResolvedValue([{ studentId: 'st' }]);
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.GUARDIAN })
        ).resolves.toEqual(['st']);
    });

    it('teacher maps assignments to enrollments', async () => {
        db.teachingAssignment.findMany.mockResolvedValue([]);
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.TEACHER })
        ).resolves.toEqual([]);
        db.teachingAssignment.findMany.mockResolvedValue([{ classId: 'c1' }]);
        db.enrollment.findMany.mockResolvedValue([{ studentId: 'st' }]);
        await expect(
            service.studentIds({ ...base, baseRole: BaseRole.TEACHER })
        ).resolves.toEqual(['st']);
    });

    it('classIds for managers, teacher, student, guardian, staff', async () => {
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.PRINCIPAL })
        ).resolves.toBeNull();
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.DEPUTY })
        ).resolves.toBeNull();
        db.teachingAssignment.findMany.mockResolvedValue([
            { classId: 'c1' },
            { classId: 'c1' },
        ]);
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.TEACHER })
        ).resolves.toEqual(['c1']);
        db.enrollment.findFirst.mockResolvedValue({ classId: 'c9' });
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.STUDENT })
        ).resolves.toEqual(['c9']);
        db.enrollment.findFirst.mockResolvedValue(null);
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.STUDENT })
        ).resolves.toEqual([]);
        db.guardianLink.findMany.mockResolvedValue([]);
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.GUARDIAN })
        ).resolves.toEqual([]);
        jest.spyOn(service, 'studentIds').mockResolvedValueOnce(null);
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.GUARDIAN })
        ).resolves.toEqual([]);
        db.guardianLink.findMany.mockResolvedValue([{ studentId: 'st' }]);
        db.enrollment.findMany.mockResolvedValue([{ classId: 'c2' }]);
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.GUARDIAN })
        ).resolves.toEqual(['c2']);
        await expect(
            service.classIds({ ...base, baseRole: BaseRole.STAFF })
        ).resolves.toEqual([]);
    });

    it('filters guardian visibility flags', async () => {
        db.guardianLink.findMany.mockResolvedValue([{ studentId: 'a' }]);
        await expect(
            service.academicStudentIds({
                ...base,
                baseRole: BaseRole.GUARDIAN,
            })
        ).resolves.toEqual(['a']);
        await expect(
            service.financialStudentIds({
                ...base,
                baseRole: BaseRole.GUARDIAN,
            })
        ).resolves.toEqual(['a']);
        await expect(
            service.academicStudentIds({
                ...base,
                baseRole: BaseRole.PRINCIPAL,
            })
        ).resolves.toBeNull();
        await expect(
            service.financialStudentIds({
                ...base,
                baseRole: BaseRole.PRINCIPAL,
            })
        ).resolves.toBeNull();
    });
});
