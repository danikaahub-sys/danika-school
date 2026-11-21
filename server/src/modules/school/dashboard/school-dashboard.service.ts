import { Injectable } from '@nestjs/common';
import {
    AttendanceStatus,
    BaseRole,
    ImportJobStatus,
    MarkStatus,
    ReceiptStatus,
    SessionStatus,
} from '@prisma/client';

import { CacheService } from 'src/common/cache/services/cache.service';
import { DatabaseService } from 'src/common/database/services/database.service';

import type { SchoolContext } from '../access/school-context';
import { ScopeService } from '../access/scope.service';

const STATS_TTL = 60;

@Injectable()
export class SchoolDashboardService {
    constructor(
        private readonly db: DatabaseService,
        private readonly cache: CacheService,
        private readonly scope: ScopeService
    ) {}

    async attention(ctx: SchoolContext) {
        const [attendance, receipts, draftMarks, importErrors, guardians] =
            await Promise.all([
                this.db.teachingSession.count({
                    where: {
                        schoolId: ctx.schoolId,
                        status: { not: SessionStatus.SUBMITTED },
                        assignment: { yearId: ctx.yearId },
                    },
                }),
                this.db.receipt.count({
                    where: {
                        schoolId: ctx.schoolId,
                        status: ReceiptStatus.PENDING,
                    },
                }),
                this.db.mark.count({
                    where: {
                        schoolId: ctx.schoolId,
                        status: MarkStatus.DRAFT,
                        assessment: { assignment: { yearId: ctx.yearId } },
                    },
                }),
                this.db.importJob.count({
                    where: {
                        schoolId: ctx.schoolId,
                        status: ImportJobStatus.FAILED,
                    },
                }),
                this.db.guardianLink.count({
                    where: { schoolId: ctx.schoolId, verifiedAt: null },
                }),
            ]);
        return {
            attendance,
            receipts,
            grades: draftMarks > 0 ? 1 : 0,
            importErrors,
            guardians,
        };
    }

    async home(ctx: SchoolContext) {
        const attention = await this.attention(ctx);
        const classIds = await this.scope.classIds(ctx);
        const studentIds = await this.scope.academicStudentIds(ctx);
        const [sessions, homework, notices] = await Promise.all([
            this.db.teachingSession.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    assignment: {
                        yearId: ctx.yearId,
                        ...(ctx.baseRole === BaseRole.TEACHER
                            ? { teacherPersonId: ctx.personId }
                            : classIds
                              ? { classId: { in: classIds } }
                              : {}),
                    },
                },
                include: {
                    assignment: {
                        include: { class: { include: { grade: true } } },
                    },
                },
                orderBy: { date: 'desc' },
                take: 20,
            }),
            this.db.homework.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    published: true,
                    ...(classIds ? { classId: { in: classIds } } : {}),
                },
                orderBy: { dueOn: 'desc' },
                take: 10,
            }),
            this.db.announcement.findMany({
                where: { schoolId: ctx.schoolId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        const grades = await this.db.mark.findMany({
            where: {
                schoolId: ctx.schoolId,
                status: MarkStatus.PUBLISHED,
                ...(studentIds ? { studentId: { in: studentIds } } : {}),
            },
            take: 20,
            include: { assessment: true },
        });
        const classes = await this.db.schoolClass.findMany({
            where: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                deletedAt: null,
                ...(classIds ? { id: { in: classIds } } : {}),
            },
            include: { grade: true },
            orderBy: { name: 'asc' },
        });
        const teacherClasses = classes.map(item => ({
            id: item.id,
            name: item.name,
            gradeId: item.gradeId,
            label: `${item.grade.name} ${item.name}`.trim(),
        }));
        return {
            attention,
            role: ctx.baseRole,
            sessions,
            homework,
            notices,
            grades,
            className: teacherClasses[0]?.label ?? '',
            teacherClasses,
        };
    }

    async attendanceSeries(
        ctx: SchoolContext,
        granularity: 'day' | 'week' | 'month'
    ) {
        return this.cached(ctx, `attendance:${granularity}`, async () => {
            const records = await this.db.attendanceRecord.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    session: { assignment: { yearId: ctx.yearId } },
                },
                include: { session: true },
            });
            const buckets = new Map<
                string,
                { present: number; total: number }
            >();
            for (const row of records) {
                const key = this.bucket(row.session.date, granularity);
                const current = buckets.get(key) ?? {
                    present: 0,
                    total: 0,
                };
                current.total += 1;
                if (row.status === AttendanceStatus.PRESENT) {
                    current.present += 1;
                }
                buckets.set(key, current);
            }
            return [...buckets.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([period, row]) => ({
                    period,
                    rate: Math.round((row.present / row.total) * 10000) / 100,
                }));
        });
    }

    async collectionsSeries(ctx: SchoolContext) {
        return this.cached(ctx, 'collections', async () => {
            const receipts = await this.db.receipt.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    status: ReceiptStatus.POSTED,
                },
            });
            const buckets = new Map<string, bigint>();
            for (const receipt of receipts) {
                const key = receipt.date.toISOString().slice(0, 7);
                buckets.set(key, (buckets.get(key) ?? 0n) + receipt.amountIrr);
            }
            return [...buckets.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([period, amount]) => ({
                    period,
                    amount: String(amount),
                }));
        });
    }

    async gradeDistribution(ctx: SchoolContext) {
        return this.cached(ctx, 'grades', async () => {
            const marks = await this.db.mark.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    status: MarkStatus.PUBLISHED,
                    assessment: { assignment: { yearId: ctx.yearId } },
                    earned: { not: null },
                },
                include: { assessment: true },
            });
            const buckets = { A: 0, B: 0, C: 0, D: 0, F: 0 };
            for (const mark of marks) {
                const pct =
                    Number(mark.assessment.maximum) === 0
                        ? 0
                        : (Number(mark.earned) /
                              Number(mark.assessment.maximum)) *
                          100;
                if (pct >= 90) buckets.A += 1;
                else if (pct >= 80) buckets.B += 1;
                else if (pct >= 70) buckets.C += 1;
                else if (pct >= 60) buckets.D += 1;
                else buckets.F += 1;
            }
            return buckets;
        });
    }

    async enrollmentSeries(ctx: SchoolContext) {
        return this.cached(ctx, 'enrollment', async () => {
            const classes = await this.db.schoolClass.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    deletedAt: null,
                },
                include: {
                    grade: true,
                    _count: { select: { enrollments: true } },
                },
            });
            return classes.map(item => ({
                classId: item.id,
                label: `${item.grade.name} ${item.name}`,
                count: item._count.enrollments,
            }));
        });
    }

    private bucket(date: Date, granularity: 'day' | 'week' | 'month') {
        const iso = date.toISOString().slice(0, 10);
        if (granularity === 'day') return iso;
        if (granularity === 'month') return iso.slice(0, 7);
        const day = new Date(`${iso}T00:00:00.000Z`);
        const weekStart = new Date(day);
        weekStart.setUTCDate(day.getUTCDate() - day.getUTCDay());
        return weekStart.toISOString().slice(0, 10);
    }

    private async cached<T>(
        ctx: SchoolContext,
        kind: string,
        loader: () => Promise<T>
    ): Promise<T> {
        const key = `school:stats:${ctx.schoolId}:${ctx.yearId}:${kind}`;
        const hit = await this.cache.get<T>(key);
        if (hit) return hit;
        const value = await loader();
        await this.cache.set(key, value, STATS_TTL);
        return value;
    }
}
