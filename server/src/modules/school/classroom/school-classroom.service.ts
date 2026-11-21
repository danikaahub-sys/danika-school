import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AttendanceStatus, MarkStatus, SessionStatus } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';

import type { SchoolContext } from '../access/school-context';
import { ScopeService } from '../access/scope.service';

export function iranianWeekday(date: Date): number {
    return ((date.getDay() + 1) % 7) + 1;
}

export function dateOnly(value: string | Date): Date {
    const raw = typeof value === 'string' ? value : value.toISOString();
    return new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
}

@Injectable()
export class SchoolClassroomService {
    constructor(
        private readonly db: DatabaseService,
        private readonly scope: ScopeService
    ) {}

    async classes(ctx: SchoolContext) {
        const classIds = await this.scope.classIds(ctx);
        return this.db.schoolClass.findMany({
            where: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                deletedAt: null,
                ...(classIds ? { id: { in: classIds } } : {}),
            },
            include: { grade: true },
            orderBy: { name: 'asc' },
        });
    }

    async workspace(ctx: SchoolContext, classId: string) {
        await this.assertClass(ctx, classId);
        const [
            schoolClass,
            sessions,
            homework,
            discipline,
            assessments,
            enrollments,
        ] = await Promise.all([
            this.db.schoolClass.findFirst({
                where: { id: classId, schoolId: ctx.schoolId },
                include: { grade: true },
            }),
            this.db.teachingSession.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    assignment: { classId, yearId: ctx.yearId },
                },
                include: { assignment: true, attendance: true },
                orderBy: { date: 'desc' },
            }),
            this.db.homework.findMany({
                where: { schoolId: ctx.schoolId, classId },
                orderBy: { dueOn: 'desc' },
            }),
            this.db.disciplineNote.findMany({
                where: { schoolId: ctx.schoolId, classId },
                include: { student: true },
                orderBy: { date: 'desc' },
            }),
            this.db.assessment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    assignment: { classId, yearId: ctx.yearId },
                },
                include: {
                    marks: { include: { student: true } },
                    assignment: true,
                },
            }),
            this.db.enrollment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    classId,
                    yearId: ctx.yearId,
                },
                include: { student: true },
            }),
        ]);
        return {
            schoolClass,
            sessions,
            attendance: sessions.flatMap(session => session.attendance),
            homework,
            discipline,
            roster: enrollments.map(item => item.student),
            scores: assessments.flatMap(item =>
                item.marks.map(mark => ({
                    ...mark,
                    subjectId: item.assignment.subjectId,
                    title: item.title,
                    maximum: Number(item.maximum),
                    weight: Number(item.weight),
                    earned: mark.earned == null ? null : Number(mark.earned),
                }))
            ),
        };
    }

    async schoolAttendance(ctx: SchoolContext) {
        const classIds = await this.scope.classIds(ctx);
        const sessions = await this.db.teachingSession.findMany({
            where: {
                schoolId: ctx.schoolId,
                assignment: {
                    yearId: ctx.yearId,
                    ...(classIds ? { classId: { in: classIds } } : {}),
                },
            },
            include: {
                attendance: { include: { student: true } },
                assignment: {
                    include: { class: { include: { grade: true } } },
                },
            },
            orderBy: { date: 'desc' },
        });
        const attendance = sessions.flatMap(session => session.attendance);
        const followUp = attendance.filter(
            row =>
                row.status === AttendanceStatus.ABSENT ||
                row.status === AttendanceStatus.LATE
        );
        const staffAttendance = await this.db.staffAttendance.findMany({
            where: { schoolId: ctx.schoolId },
            include: { person: true },
            orderBy: { date: 'desc' },
        });
        return { sessions, attendance, staffAttendance, followUp };
    }

    async results(ctx: SchoolContext) {
        const studentIds = await this.scope.academicStudentIds(ctx);
        const classIds = await this.scope.classIds(ctx);
        return this.db.mark.findMany({
            where: {
                schoolId: ctx.schoolId,
                ...(studentIds ? { studentId: { in: studentIds } } : {}),
                assessment: {
                    assignment: {
                        yearId: ctx.yearId,
                        ...(classIds ? { classId: { in: classIds } } : {}),
                    },
                },
            },
            include: {
                student: true,
                assessment: { include: { assignment: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async markAttendance(
        ctx: SchoolContext,
        sessionId: string,
        rows: Array<{ studentId: string; status: AttendanceStatus }>
    ) {
        const session = await this.assertSession(ctx, sessionId);
        if (session.status === SessionStatus.SUBMITTED) {
            throw new HttpException(
                'school.error.sessionSubmitted',
                HttpStatus.CONFLICT
            );
        }
        await this.db.$transaction(
            rows.map(row =>
                this.db.attendanceRecord.upsert({
                    where: {
                        sessionId_studentId: {
                            sessionId,
                            studentId: row.studentId,
                        },
                    },
                    update: { status: row.status },
                    create: {
                        schoolId: ctx.schoolId,
                        sessionId,
                        studentId: row.studentId,
                        status: row.status,
                    },
                })
            )
        );
        if (session.status === SessionStatus.SCHEDULED) {
            await this.db.teachingSession.update({
                where: { id: sessionId },
                data: { status: SessionStatus.DRAFT },
            });
        }
        return { success: true };
    }

    async submitSession(ctx: SchoolContext, sessionId: string) {
        await this.assertSession(ctx, sessionId);
        return this.db.teachingSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.SUBMITTED },
        });
    }

    async markStaff(
        ctx: SchoolContext,
        data: { personId: string; date: string; status: AttendanceStatus }
    ) {
        const date = dateOnly(data.date);
        return this.db.staffAttendance.upsert({
            where: {
                schoolId_personId_date: {
                    schoolId: ctx.schoolId,
                    personId: data.personId,
                    date,
                },
            },
            update: { status: data.status },
            create: {
                schoolId: ctx.schoolId,
                personId: data.personId,
                date,
                status: data.status,
            },
        });
    }

    createHomework(
        ctx: SchoolContext,
        data: {
            classId: string;
            subjectId: string;
            title: string;
            dueOn: string;
        }
    ) {
        return this.db.homework.create({
            data: {
                schoolId: ctx.schoolId,
                classId: data.classId,
                subjectId: data.subjectId,
                teacherId: ctx.personId,
                title: data.title,
                dueOn: dateOnly(data.dueOn),
            },
        });
    }

    async publishHomework(ctx: SchoolContext, id: string) {
        const item = await this.db.homework.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
        if (!item) {
            throw new HttpException(
                'school.error.homeworkNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return this.db.homework.update({
            where: { id },
            data: { published: true },
        });
    }

    createDiscipline(
        ctx: SchoolContext,
        data: {
            studentId: string;
            classId: string;
            title: string;
            date: string;
        }
    ) {
        return this.db.disciplineNote.create({
            data: {
                schoolId: ctx.schoolId,
                studentId: data.studentId,
                classId: data.classId,
                title: data.title,
                date: dateOnly(data.date),
            },
        });
    }

    createAssessment(
        ctx: SchoolContext,
        data: {
            assignmentId: string;
            title: string;
            maximum: number;
            weight: number;
        }
    ) {
        return this.db.assessment.create({
            data: {
                schoolId: ctx.schoolId,
                assignmentId: data.assignmentId,
                title: data.title,
                maximum: data.maximum,
                weight: data.weight,
            },
        });
    }

    async saveMarks(
        ctx: SchoolContext,
        assessmentId: string,
        rows: Array<{ studentId: string; earned?: number; status?: MarkStatus }>
    ) {
        const assessment = await this.db.assessment.findFirst({
            where: { id: assessmentId, schoolId: ctx.schoolId },
        });
        if (!assessment) {
            throw new HttpException(
                'school.error.assessmentNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        if (assessment.publishedAt) {
            throw new HttpException(
                'school.error.assessmentPublished',
                HttpStatus.CONFLICT
            );
        }
        await this.db.$transaction(
            rows.map(row =>
                this.db.mark.upsert({
                    where: {
                        assessmentId_studentId: {
                            assessmentId,
                            studentId: row.studentId,
                        },
                    },
                    update: {
                        earned: row.earned,
                        status: row.status ?? MarkStatus.DRAFT,
                    },
                    create: {
                        schoolId: ctx.schoolId,
                        assessmentId,
                        studentId: row.studentId,
                        earned: row.earned,
                        status: row.status ?? MarkStatus.DRAFT,
                    },
                })
            )
        );
        return { success: true };
    }

    async publishAssessment(ctx: SchoolContext, assessmentId: string) {
        const assessment = await this.db.assessment.findFirst({
            where: { id: assessmentId, schoolId: ctx.schoolId },
        });
        if (!assessment) {
            throw new HttpException(
                'school.error.assessmentNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        await this.db.$transaction([
            this.db.assessment.update({
                where: { id: assessmentId },
                data: { publishedAt: new Date() },
            }),
            this.db.mark.updateMany({
                where: { assessmentId, schoolId: ctx.schoolId },
                data: { status: MarkStatus.PUBLISHED },
            }),
        ]);
        return { success: true };
    }

    async reportCard(ctx: SchoolContext, studentId: string) {
        const allowed = await this.scope.academicStudentIds(ctx);
        if (allowed && !allowed.includes(studentId)) {
            throw new HttpException(
                'school.error.personNotFound',
                HttpStatus.FORBIDDEN
            );
        }
        const marks = await this.db.mark.findMany({
            where: {
                schoolId: ctx.schoolId,
                studentId,
                status: MarkStatus.PUBLISHED,
                assessment: { assignment: { yearId: ctx.yearId } },
            },
            include: {
                assessment: {
                    include: { assignment: { include: { subject: true } } },
                },
            },
        });
        const bySubject = new Map<
            string,
            { subject: string; earned: number; maximum: number; weight: number }
        >();
        for (const mark of marks) {
            const subject = mark.assessment.assignment.subject;
            const current = bySubject.get(subject.id) ?? {
                subject: subject.name,
                earned: 0,
                maximum: 0,
                weight: 0,
            };
            const earned = Number(mark.earned ?? 0);
            const maximum = Number(mark.assessment.maximum);
            const weight = Number(mark.assessment.weight);
            current.earned += earned * weight;
            current.maximum += maximum * weight;
            current.weight += weight;
            bySubject.set(subject.id, current);
        }
        const subjects = [...bySubject.values()].map(item => ({
            subject: item.subject,
            average:
                item.maximum === 0
                    ? 0
                    : Math.round((item.earned / item.maximum) * 10000) / 100,
        }));
        const overall =
            subjects.length === 0
                ? 0
                : Math.round(
                      (subjects.reduce((sum, item) => sum + item.average, 0) /
                          subjects.length) *
                          100
                  ) / 100;
        return { studentId, subjects, overall };
    }

    async generateForSchool(schoolId: string, date = new Date()) {
        const dayDate = dateOnly(date);
        const year = await this.db.academicYear.findFirst({
            where: { schoolId, isActive: true, deletedAt: null },
        });
        if (!year) return { created: 0 };
        const closed = await this.db.closure.findFirst({
            where: { schoolId, yearId: year.id, date: dayDate },
        });
        if (closed) return { created: 0 };
        const day = iranianWeekday(dayDate);
        const slots = await this.db.timetableSlot.findMany({
            where: {
                schoolId,
                day,
                assignment: { yearId: year.id, deletedAt: null },
            },
        });
        let created = 0;
        for (const slot of slots) {
            const existing = await this.db.teachingSession.findFirst({
                where: {
                    schoolId,
                    assignmentId: slot.assignmentId,
                    periodId: slot.periodId,
                    date: dayDate,
                },
            });
            if (existing) continue;
            await this.db.teachingSession.create({
                data: {
                    schoolId,
                    assignmentId: slot.assignmentId,
                    periodId: slot.periodId,
                    date: dayDate,
                    status: SessionStatus.SCHEDULED,
                },
            });
            created += 1;
        }
        return { created };
    }

    private async assertClass(ctx: SchoolContext, classId: string) {
        const classIds = await this.scope.classIds(ctx);
        if (classIds && !classIds.includes(classId)) {
            throw new HttpException(
                'school.error.classNotFound',
                HttpStatus.FORBIDDEN
            );
        }
        const schoolClass = await this.db.schoolClass.findFirst({
            where: { id: classId, schoolId: ctx.schoolId, yearId: ctx.yearId },
        });
        if (!schoolClass) {
            throw new HttpException(
                'school.error.classNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return schoolClass;
    }

    private async assertSession(ctx: SchoolContext, sessionId: string) {
        const session = await this.db.teachingSession.findFirst({
            where: { id: sessionId, schoolId: ctx.schoolId },
            include: { assignment: true },
        });
        if (!session) {
            throw new HttpException(
                'school.error.sessionNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        const classIds = await this.scope.classIds(ctx);
        if (classIds && !classIds.includes(session.assignment.classId)) {
            throw new HttpException(
                'school.error.sessionNotFound',
                HttpStatus.FORBIDDEN
            );
        }
        return session;
    }
}
