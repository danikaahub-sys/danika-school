import { Injectable } from '@nestjs/common';
import {
    AttendanceStatus,
    BaseRole,
    ImportJobStatus,
    MarkStatus,
    PersonKind,
    PersonStatus,
    ReceiptStatus,
    SessionStatus,
} from '@prisma/client';

import { CacheService } from 'src/common/cache/services/cache.service';
import { DatabaseService } from 'src/common/database/services/database.service';

import type { SchoolContext } from '../access/school-context';
import { ScopeService } from '../access/scope.service';
import {
    eachYmd,
    periodBounds,
    type OverviewRange,
} from './school-dashboard.period';

const STATS_TTL = 60;

type StatusCount = Partial<Record<string, number>>;

function rateFromCounts(counts: StatusCount): {
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
    rate: number;
} {
    const present = counts[AttendanceStatus.PRESENT] ?? 0;
    const absent = counts[AttendanceStatus.ABSENT] ?? 0;
    const late = counts[AttendanceStatus.LATE] ?? 0;
    const excused = counts[AttendanceStatus.EXCUSED] ?? 0;
    const unmarked = counts[AttendanceStatus.UNMARKED] ?? 0;
    const marked = present + absent + late + excused;
    const rate =
        marked === 0 ? 0 : Math.round((present / marked) * 10000) / 100;
    return { present, absent, late, excused, unmarked, rate };
}

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
                        include: {
                            class: { include: { grade: true } },
                            subject: true,
                        },
                    },
                    period: true,
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
        const gradeRows = await this.db.mark.findMany({
            where: {
                schoolId: ctx.schoolId,
                status: MarkStatus.PUBLISHED,
                ...(studentIds ? { studentId: { in: studentIds } } : {}),
            },
            take: 20,
            include: { assessment: true },
        });
        const grades = gradeRows.map(mark => ({
            id: mark.id,
            studentId: mark.studentId,
            title: mark.assessment.title,
            maximum: Number(mark.assessment.maximum),
            weight: Number(mark.assessment.weight),
            earned: mark.earned == null ? null : Number(mark.earned),
            status: mark.status,
            assessment: mark.assessment,
        }));
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

    async overview(ctx: SchoolContext, range: OverviewRange = 'day') {
        const bounds = periodBounds(range);
        return this.cached(
            ctx,
            `overview:${range}:${bounds.fromYmd}`,
            async () => this.buildOverview(ctx, bounds)
        );
    }

    private async buildOverview(
        ctx: SchoolContext,
        bounds: ReturnType<typeof periodBounds>
    ) {
        const dateInRange = { gte: bounds.from, lte: bounds.to };
        const dateInPrev = { gte: bounds.prevFrom, lte: bounds.prevTo };
        const dateInTrend = {
            gte: new Date(`${bounds.trendFromYmd}T00:00:00.000Z`),
            lte: new Date(`${bounds.trendToYmd}T00:00:00.000Z`),
        };
        const createdEnd = new Date(bounds.to);
        createdEnd.setUTCDate(createdEnd.getUTCDate() + 1);
        const createdInRange = {
            gte: bounds.from,
            lt: createdEnd,
        };

        const sessionYear = { assignment: { yearId: ctx.yearId } };

        const [
            studentCount,
            staffCount,
            classCount,
            attendanceGroups,
            prevAttendanceGroups,
            sessionGroups,
            prevSessionGroups,
            staffGroups,
            collected,
            prevCollected,
            pending,
            homeworkDue,
            announcementsSent,
            absentRows,
            trendAttendance,
            trendReceipts,
        ] = await Promise.all([
            this.db.enrollment.count({
                where: { schoolId: ctx.schoolId, yearId: ctx.yearId },
            }),
            this.db.person.count({
                where: {
                    schoolId: ctx.schoolId,
                    kind: PersonKind.STAFF,
                    deletedAt: null,
                    status: PersonStatus.ACTIVE,
                },
            }),
            this.db.schoolClass.count({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    deletedAt: null,
                },
            }),
            this.db.attendanceRecord.groupBy({
                by: ['status'],
                where: {
                    schoolId: ctx.schoolId,
                    session: { ...sessionYear, date: dateInRange },
                },
                _count: { _all: true },
            }),
            this.db.attendanceRecord.groupBy({
                by: ['status'],
                where: {
                    schoolId: ctx.schoolId,
                    session: { ...sessionYear, date: dateInPrev },
                },
                _count: { _all: true },
            }),
            this.db.teachingSession.groupBy({
                by: ['status'],
                where: {
                    schoolId: ctx.schoolId,
                    date: dateInRange,
                    ...sessionYear,
                },
                _count: { _all: true },
            }),
            this.db.teachingSession.groupBy({
                by: ['status'],
                where: {
                    schoolId: ctx.schoolId,
                    date: dateInPrev,
                    ...sessionYear,
                },
                _count: { _all: true },
            }),
            this.db.staffAttendance.groupBy({
                by: ['status'],
                where: { schoolId: ctx.schoolId, date: dateInRange },
                _count: { _all: true },
            }),
            this.db.receipt.aggregate({
                where: {
                    schoolId: ctx.schoolId,
                    status: ReceiptStatus.POSTED,
                    date: dateInRange,
                },
                _sum: { amountIrr: true },
                _count: { _all: true },
            }),
            this.db.receipt.aggregate({
                where: {
                    schoolId: ctx.schoolId,
                    status: ReceiptStatus.POSTED,
                    date: dateInPrev,
                },
                _sum: { amountIrr: true },
                _count: { _all: true },
            }),
            this.db.receipt.aggregate({
                where: {
                    schoolId: ctx.schoolId,
                    status: ReceiptStatus.PENDING,
                    date: dateInRange,
                },
                _sum: { amountIrr: true },
                _count: { _all: true },
            }),
            this.db.homework.count({
                where: {
                    schoolId: ctx.schoolId,
                    published: true,
                    dueOn: dateInRange,
                },
            }),
            this.db.announcement.count({
                where: {
                    schoolId: ctx.schoolId,
                    createdAt: createdInRange,
                },
            }),
            this.db.attendanceRecord.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    status: AttendanceStatus.ABSENT,
                    session: { ...sessionYear, date: dateInRange },
                },
                select: {
                    session: {
                        select: {
                            assignment: {
                                select: {
                                    class: {
                                        select: {
                                            id: true,
                                            name: true,
                                            grade: { select: { name: true } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            this.db.attendanceRecord.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    session: { ...sessionYear, date: dateInTrend },
                },
                select: {
                    status: true,
                    session: { select: { date: true } },
                },
            }),
            this.db.receipt.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    status: ReceiptStatus.POSTED,
                    date: dateInTrend,
                },
                select: { date: true, amountIrr: true },
            }),
        ]);

        const toCountMap = (
            rows: Array<{ status: string; _count: { _all: number } }>
        ): StatusCount => {
            const map: StatusCount = {};
            for (const row of rows) map[row.status] = row._count._all;
            return map;
        };

        const attendance = rateFromCounts(toCountMap(attendanceGroups));
        const prevAttendance = rateFromCounts(toCountMap(prevAttendanceGroups));

        const sessionMap = toCountMap(sessionGroups);
        const prevSessionMap = toCountMap(prevSessionGroups);
        const sumCounts = (map: StatusCount): number =>
            Object.values(map).reduce<number>((sum, n) => sum + (n ?? 0), 0);
        const sessionTotal = sumCounts(sessionMap);
        const prevSessionTotal = sumCounts(prevSessionMap);
        const submitted = sessionMap[SessionStatus.SUBMITTED] ?? 0;
        const prevSubmitted = prevSessionMap[SessionStatus.SUBMITTED] ?? 0;

        const staffMap = toCountMap(staffGroups);
        const classAbsent = new Map<
            string,
            { classId: string; label: string; absent: number }
        >();
        for (const row of absentRows) {
            const cls = row.session.assignment.class;
            const current = classAbsent.get(cls.id) ?? {
                classId: cls.id,
                label: `${cls.grade.name} ${cls.name}`.trim(),
                absent: 0,
            };
            current.absent += 1;
            classAbsent.set(cls.id, current);
        }
        const absencesByClass = [...classAbsent.values()]
            .sort((a, b) => b.absent - a.absent)
            .slice(0, 5);

        const days = eachYmd(bounds.trendFromYmd, bounds.trendToYmd);
        const attendanceByDay = new Map<
            string,
            { present: number; marked: number }
        >();
        for (const day of days) {
            attendanceByDay.set(day, { present: 0, marked: 0 });
        }
        for (const row of trendAttendance) {
            const day = row.session.date.toISOString().slice(0, 10);
            const bucket = attendanceByDay.get(day);
            if (!bucket) continue;
            if (row.status !== AttendanceStatus.UNMARKED) {
                bucket.marked += 1;
            }
            if (row.status === AttendanceStatus.PRESENT) {
                bucket.present += 1;
            }
        }
        const collectedByDay = new Map<string, bigint>();
        for (const day of days) collectedByDay.set(day, 0n);
        for (const row of trendReceipts) {
            const day = row.date.toISOString().slice(0, 10);
            collectedByDay.set(
                day,
                (collectedByDay.get(day) ?? 0n) + row.amountIrr
            );
        }
        const trend = days.map(date => {
            const bucket = attendanceByDay.get(date) ?? {
                present: 0,
                marked: 0,
            };
            return {
                date,
                attendanceRate:
                    bucket.marked === 0
                        ? 0
                        : Math.round((bucket.present / bucket.marked) * 10000) /
                          100,
                collectedIrr: String(collectedByDay.get(date) ?? 0n),
            };
        });

        return {
            range: {
                key: bounds.key,
                from: bounds.fromYmd,
                to: bounds.toYmd,
                label: bounds.label,
            },
            headcount: {
                students: studentCount,
                staff: staffCount,
                classes: classCount,
            },
            attendance: {
                present: attendance.present,
                absent: attendance.absent,
                late: attendance.late,
                excused: attendance.excused,
                unmarked: attendance.unmarked,
                rate: attendance.rate,
                prevRate: prevAttendance.rate,
                prevAbsent: prevAttendance.absent,
            },
            sessions: {
                total: sessionTotal,
                submitted,
                pending: sessionTotal - submitted,
                prevTotal: prevSessionTotal,
                prevSubmitted,
            },
            staff: {
                present: staffMap[AttendanceStatus.PRESENT] ?? 0,
                absent: staffMap[AttendanceStatus.ABSENT] ?? 0,
            },
            finance: {
                collectedIrr: String(collected._sum.amountIrr ?? 0n),
                prevCollectedIrr: String(prevCollected._sum.amountIrr ?? 0n),
                postedCount: collected._count._all,
                pendingCount: pending._count._all,
                pendingIrr: String(pending._sum.amountIrr ?? 0n),
            },
            activity: {
                homeworkDue,
                announcementsSent,
            },
            absencesByClass,
            trend,
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
