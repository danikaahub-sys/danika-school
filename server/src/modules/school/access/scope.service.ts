import { Injectable } from '@nestjs/common';
import { BaseRole } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';

import type { SchoolContext } from './school-context';

@Injectable()
export class ScopeService {
    constructor(private readonly db: DatabaseService) {}

    tenant<T extends object>(
        ctx: SchoolContext,
        extra?: T
    ): T & { schoolId: string } {
        return { schoolId: ctx.schoolId, ...(extra ?? ({} as T)) };
    }

    async studentIds(ctx: SchoolContext): Promise<string[] | null> {
        if (
            ctx.baseRole === BaseRole.PRINCIPAL ||
            ctx.baseRole === BaseRole.DEPUTY ||
            ctx.baseRole === BaseRole.FINANCE ||
            ctx.baseRole === BaseRole.COUNSELOR
        ) {
            return null;
        }
        if (ctx.baseRole === BaseRole.STUDENT) {
            return [ctx.personId];
        }
        if (ctx.baseRole === BaseRole.GUARDIAN) {
            const links = await this.db.guardianLink.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    guardianId: ctx.personId,
                    verifiedAt: { not: null },
                },
                select: { studentId: true },
            });
            return links.map(link => link.studentId);
        }
        if (ctx.baseRole === BaseRole.TEACHER) {
            const assignments = await this.db.teachingAssignment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    teacherPersonId: ctx.personId,
                    deletedAt: null,
                },
                select: { classId: true },
            });
            const classIds = assignments.map(item => item.classId);
            if (classIds.length === 0) return [];
            const enrollments = await this.db.enrollment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    classId: { in: classIds },
                },
                select: { studentId: true },
            });
            return enrollments.map(item => item.studentId);
        }
        return [];
    }

    async classIds(ctx: SchoolContext): Promise<string[] | null> {
        if (
            ctx.baseRole === BaseRole.PRINCIPAL ||
            ctx.baseRole === BaseRole.DEPUTY
        ) {
            return null;
        }
        if (ctx.baseRole === BaseRole.TEACHER) {
            const assignments = await this.db.teachingAssignment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    teacherPersonId: ctx.personId,
                    deletedAt: null,
                },
                select: { classId: true },
            });
            return [...new Set(assignments.map(item => item.classId))];
        }
        if (ctx.baseRole === BaseRole.STUDENT) {
            const enrollment = await this.db.enrollment.findFirst({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    studentId: ctx.personId,
                },
            });
            return enrollment ? [enrollment.classId] : [];
        }
        if (ctx.baseRole === BaseRole.GUARDIAN) {
            const studentIds = await this.studentIds(ctx);
            if (!studentIds || studentIds.length === 0) return [];
            const enrollments = await this.db.enrollment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    studentId: { in: studentIds },
                },
                select: { classId: true },
            });
            return [...new Set(enrollments.map(item => item.classId))];
        }
        return [];
    }

    async academicStudentIds(ctx: SchoolContext): Promise<string[] | null> {
        if (ctx.baseRole !== BaseRole.GUARDIAN) return this.studentIds(ctx);
        const links = await this.db.guardianLink.findMany({
            where: {
                schoolId: ctx.schoolId,
                guardianId: ctx.personId,
                verifiedAt: { not: null },
                academicVisible: true,
            },
            select: { studentId: true },
        });
        return links.map(link => link.studentId);
    }

    async financialStudentIds(ctx: SchoolContext): Promise<string[] | null> {
        if (ctx.baseRole !== BaseRole.GUARDIAN) return this.studentIds(ctx);
        const links = await this.db.guardianLink.findMany({
            where: {
                schoolId: ctx.schoolId,
                guardianId: ctx.personId,
                verifiedAt: { not: null },
                financialVisible: true,
            },
            select: { studentId: true },
        });
        return links.map(link => link.studentId);
    }
}
