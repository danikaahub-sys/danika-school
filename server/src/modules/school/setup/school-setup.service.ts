import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { DatabaseService } from 'src/common/database/services/database.service';

import type { SchoolContext } from '../access/school-context';

@Injectable()
export class SchoolSetupService {
    constructor(private readonly db: DatabaseService) {}

    async bundle(ctx: SchoolContext) {
        const schoolId = ctx.schoolId;
        const yearId = ctx.yearId;
        const [
            years,
            grades,
            classes,
            subjects,
            assignments,
            periods,
            timetable,
            closures,
        ] = await Promise.all([
            this.db.academicYear.findMany({
                where: { schoolId, deletedAt: null },
                orderBy: { startsOn: 'desc' },
            }),
            this.db.grade.findMany({
                where: { schoolId, deletedAt: null },
                orderBy: { name: 'asc' },
            }),
            this.db.schoolClass.findMany({
                where: { schoolId, yearId, deletedAt: null },
                orderBy: { name: 'asc' },
            }),
            this.db.subject.findMany({
                where: { schoolId, deletedAt: null },
                orderBy: { name: 'asc' },
            }),
            this.db.teachingAssignment.findMany({
                where: { schoolId, yearId, deletedAt: null },
                include: { teacher: true },
            }),
            this.db.bellPeriod.findMany({
                where: { schoolId },
                orderBy: { sortOrder: 'asc' },
            }),
            this.db.timetableSlot.findMany({
                where: { schoolId },
                include: { assignment: true },
            }),
            this.db.closure.findMany({
                where: { schoolId, yearId },
                orderBy: { date: 'asc' },
            }),
        ]);
        return {
            years: years.map(year => ({
                id: year.id,
                label: year.label,
                active: year.isActive,
            })),
            grades,
            classes,
            subjects,
            assignments: assignments.map(item => ({
                id: item.id,
                classId: item.classId,
                subjectId: item.subjectId,
                teacherId: item.teacherPersonId,
                teacherName: item.teacher
                    ? `${item.teacher.firstName} ${item.teacher.lastName}`.trim()
                    : '',
            })),
            periods: periods.map(item => ({
                id: item.id,
                name: item.name,
                start: item.startTime,
                end: item.endTime,
            })),
            timetable: timetable.map(item => ({
                classId: item.classId,
                day: item.day,
                periodId: item.periodId,
                subjectId: item.assignment.subjectId,
                teacherId: item.assignment.teacherPersonId,
            })),
            closures,
        };
    }

    createYear(
        ctx: SchoolContext,
        data: { label: string; startsOn: string; endsOn: string }
    ) {
        return this.db.academicYear.create({
            data: {
                schoolId: ctx.schoolId,
                label: data.label,
                startsOn: new Date(data.startsOn),
                endsOn: new Date(data.endsOn),
            },
        });
    }

    async activateYear(ctx: SchoolContext, yearId: string) {
        await this.assertYear(ctx, yearId);
        await this.db.$transaction([
            this.db.academicYear.updateMany({
                where: { schoolId: ctx.schoolId, isActive: true },
                data: { isActive: false },
            }),
            this.db.academicYear.update({
                where: { id: yearId },
                data: { isActive: true },
            }),
        ]);
        return { success: true };
    }

    async rollover(
        ctx: SchoolContext,
        data: { label: string; startsOn: string; endsOn: string }
    ) {
        const sourceYearId = ctx.yearId;
        const classes = await this.db.schoolClass.findMany({
            where: {
                schoolId: ctx.schoolId,
                yearId: sourceYearId,
                deletedAt: null,
            },
        });
        const assignments = await this.db.teachingAssignment.findMany({
            where: {
                schoolId: ctx.schoolId,
                yearId: sourceYearId,
                deletedAt: null,
            },
        });
        return this.db.$transaction(async tx => {
            await tx.academicYear.updateMany({
                where: { schoolId: ctx.schoolId, isActive: true },
                data: { isActive: false },
            });
            const year = await tx.academicYear.create({
                data: {
                    schoolId: ctx.schoolId,
                    label: data.label,
                    startsOn: new Date(data.startsOn),
                    endsOn: new Date(data.endsOn),
                    isActive: true,
                },
            });
            const classMap = new Map<string, string>();
            for (const item of classes) {
                const created = await tx.schoolClass.create({
                    data: {
                        schoolId: ctx.schoolId,
                        yearId: year.id,
                        gradeId: item.gradeId,
                        name: item.name,
                    },
                });
                classMap.set(item.id, created.id);
            }
            for (const item of assignments) {
                const classId = classMap.get(item.classId);
                if (!classId) continue;
                await tx.teachingAssignment.create({
                    data: {
                        schoolId: ctx.schoolId,
                        yearId: year.id,
                        classId,
                        subjectId: item.subjectId,
                        teacherPersonId: item.teacherPersonId,
                    },
                });
            }
            return year;
        });
    }

    createGrade(ctx: SchoolContext, name: string) {
        return this.db.grade.create({
            data: { schoolId: ctx.schoolId, name },
        });
    }

    createClass(ctx: SchoolContext, data: { name: string; gradeId: string }) {
        return this.db.schoolClass.create({
            data: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                name: data.name,
                gradeId: data.gradeId,
            },
        });
    }

    createSubject(ctx: SchoolContext, name: string) {
        return this.db.subject.create({
            data: { schoolId: ctx.schoolId, name },
        });
    }

    createAssignment(
        ctx: SchoolContext,
        data: { classId: string; subjectId: string; teacherId: string }
    ) {
        return this.db.teachingAssignment.create({
            data: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                classId: data.classId,
                subjectId: data.subjectId,
                teacherPersonId: data.teacherId,
            },
        });
    }

    createPeriod(
        ctx: SchoolContext,
        data: { name: string; start: string; end: string; sortOrder?: number }
    ) {
        return this.db.bellPeriod.create({
            data: {
                schoolId: ctx.schoolId,
                name: data.name,
                startTime: data.start,
                endTime: data.end,
                sortOrder: data.sortOrder ?? 0,
            },
        });
    }

    async upsertTimetable(
        ctx: SchoolContext,
        slots: Array<{
            classId: string;
            day: number;
            periodId: string;
            assignmentId: string;
        }>
    ) {
        await this.db.timetableSlot.deleteMany({
            where: { schoolId: ctx.schoolId },
        });
        if (slots.length === 0) return { count: 0 };
        const created = await this.db.timetableSlot.createMany({
            data: slots.map(slot => ({
                schoolId: ctx.schoolId,
                classId: slot.classId,
                day: slot.day,
                periodId: slot.periodId,
                assignmentId: slot.assignmentId,
            })),
        });
        return created;
    }

    createClosure(ctx: SchoolContext, data: { date: string; title: string }) {
        return this.db.closure.create({
            data: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                date: new Date(data.date),
                title: data.title,
            },
        });
    }

    private async assertYear(ctx: SchoolContext, yearId: string) {
        const year = await this.db.academicYear.findFirst({
            where: { id: yearId, schoolId: ctx.schoolId },
        });
        if (!year) {
            throw new HttpException(
                'school.error.yearNotFound',
                HttpStatus.NOT_FOUND
            );
        }
    }
}
