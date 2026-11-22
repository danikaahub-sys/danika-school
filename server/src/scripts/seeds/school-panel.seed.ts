import { Injectable, Logger } from '@nestjs/common';
import {
    AttendanceStatus,
    BaseRole,
    DeliveryStatus,
    ImportJobKind,
    ImportJobStatus,
    MarkStatus,
    MembershipStatus,
    MessageChannel,
    PersonKind,
    ReceiptStatus,
    SessionStatus,
} from '@prisma/client';
import { Command } from 'nestjs-command';

import { DatabaseService } from 'src/common/database/services/database.service';

const PANEL_SCHOOLS = ['دبیرستان دانیکا', 'مدرسه دانیکا ۲'] as const;
const SAMPLE_STUDENT_LIMIT = 40;
const SESSION_DAY_COUNT = 5;
const ASSIGNMENT_SAMPLE = 8;

@Injectable()
export class SchoolPanelSeed {
    private readonly logger = new Logger(SchoolPanelSeed.name);

    constructor(private readonly db: DatabaseService) {}

    @Command({
        command: 'seed:school-panel',
        describe:
            'Idempotent panel demo data: finance, attendance, homework, grades, comms.',
    })
    async seed(): Promise<void> {
        for (const name of PANEL_SCHOOLS) {
            const school = await this.db.school.findFirst({ where: { name } });
            if (!school) {
                this.logger.warn(`Skip missing school: ${name}`);
                continue;
            }
            const summary = await this.enrich(school.id, name);
            this.logger.log(`Panel seed ${name}: ${JSON.stringify(summary)}`);
        }
    }

    private async enrich(schoolId: string, name: string) {
        const year = await this.db.academicYear.findFirst({
            where: { schoolId, isActive: true, deletedAt: null },
        });
        if (!year) {
            return { school: name, skipped: 'no-active-year' };
        }

        const [classes, subjects, periods, assignments, teachers, plan] =
            await Promise.all([
                this.db.schoolClass.findMany({
                    where: { schoolId, yearId: year.id, deletedAt: null },
                }),
                this.db.subject.findMany({
                    where: { schoolId, deletedAt: null },
                }),
                this.db.bellPeriod.findMany({
                    where: { schoolId },
                    orderBy: { sortOrder: 'asc' },
                }),
                this.db.teachingAssignment.findMany({
                    where: { schoolId, yearId: year.id, deletedAt: null },
                }),
                this.db.person.findMany({
                    where: {
                        schoolId,
                        kind: PersonKind.STAFF,
                        deletedAt: null,
                        memberships: {
                            some: {
                                position: { baseRole: BaseRole.TEACHER },
                            },
                        },
                    },
                    take: 4,
                }),
                this.db.tuitionPlan.findFirst({
                    where: { schoolId, yearId: year.id },
                }),
            ]);

        const enrollments = await this.db.enrollment.findMany({
            where: { schoolId, yearId: year.id },
            include: { student: true },
        });
        const studentsByClass = new Map<string, string[]>();
        for (const row of enrollments) {
            const list = studentsByClass.get(row.classId) ?? [];
            list.push(row.studentId);
            studentsByClass.set(row.classId, list);
        }
        const sampleStudents = enrollments
            .map(row => row.student)
            .slice(0, SAMPLE_STUDENT_LIMIT);

        const summary = {
            school: name,
            charges: 0,
            receipts: 0,
            sessions: 0,
            attendance: 0,
            homework: 0,
            assessments: 0,
            marks: 0,
            discipline: 0,
            announcements: 0,
            templates: 0,
            closures: 0,
            staffAttendance: 0,
            importJobs: 0,
            audit: 0,
        };

        if (
            plan &&
            sampleStudents.length &&
            (await this.db.charge.count({
                where: { schoolId, yearId: year.id },
            })) === 0
        ) {
            const batch = await this.db.chargeBatch.create({
                data: {
                    schoolId,
                    yearId: year.id,
                    title: 'قسط اول شهریه',
                    dueOn: daysFromNow(14),
                },
            });
            await this.db.charge.createMany({
                data: sampleStudents.map((student, index) => ({
                    schoolId,
                    yearId: year.id,
                    studentId: student.id,
                    planId: plan.id,
                    batchId: batch.id,
                    title: 'شهریه ترم اول',
                    amountIrr: 20_000_000n + BigInt((index % 5) * 500_000),
                    dueOn: daysFromNow(14),
                })),
            });
            summary.charges = sampleStudents.length;
        }

        if (
            sampleStudents.length &&
            (await this.db.receipt.count({ where: { schoolId } })) === 0
        ) {
            const admin = await this.db.user.findFirst({
                where: {
                    memberships: {
                        some: {
                            schoolId,
                            status: MembershipStatus.ACTIVE,
                            position: { baseRole: BaseRole.PRINCIPAL },
                        },
                    },
                },
            });
            const rows = sampleStudents.slice(0, 18).map((student, index) => ({
                schoolId,
                studentId: student.id,
                amountIrr: 5_000_000n + BigInt((index % 4) * 1_000_000),
                status:
                    index % 3 === 0
                        ? ReceiptStatus.PENDING
                        : index % 3 === 1
                          ? ReceiptStatus.POSTED
                          : ReceiptStatus.REVERSED,
                ref: `RCP-${index + 1000}`,
                date: daysAgo(index % 20),
                approvedById: index % 3 !== 0 ? (admin?.id ?? null) : null,
            }));
            await this.db.receipt.createMany({ data: rows });
            summary.receipts = rows.length;
        }

        if (
            assignments.length &&
            periods.length &&
            (await this.db.teachingSession.count({ where: { schoolId } })) <
                SESSION_DAY_COUNT
        ) {
            const created: Array<{
                id: string;
                classId: string;
                status: SessionStatus;
            }> = [];
            for (
                let dayOffset = 1;
                dayOffset <= SESSION_DAY_COUNT;
                dayOffset++
            ) {
                for (const [index, assignment] of assignments
                    .slice(0, ASSIGNMENT_SAMPLE)
                    .entries()) {
                    const status =
                        dayOffset <= 2
                            ? SessionStatus.SUBMITTED
                            : dayOffset === 3
                              ? SessionStatus.DRAFT
                              : SessionStatus.SCHEDULED;
                    try {
                        const session = await this.db.teachingSession.create({
                            data: {
                                schoolId,
                                assignmentId: assignment.id,
                                periodId: periods[index % periods.length].id,
                                date: daysAgo(dayOffset),
                                status,
                            },
                        });
                        created.push({
                            id: session.id,
                            classId: assignment.classId,
                            status,
                        });
                    } catch {
                        /* unique collision on re-run */
                    }
                }
            }
            summary.sessions = created.length;
            for (const session of created) {
                const studentIds = (
                    studentsByClass.get(session.classId) ?? []
                ).slice(0, 20);
                if (!studentIds.length) continue;
                await this.db.attendanceRecord.createMany({
                    data: studentIds.map((studentId, index) => ({
                        schoolId,
                        sessionId: session.id,
                        studentId,
                        status:
                            session.status === SessionStatus.SCHEDULED
                                ? AttendanceStatus.UNMARKED
                                : index % 11 === 0
                                  ? AttendanceStatus.ABSENT
                                  : AttendanceStatus.PRESENT,
                    })),
                    skipDuplicates: true,
                });
                summary.attendance += studentIds.length;
            }
        }

        if (
            classes.length &&
            subjects.length &&
            teachers.length &&
            (await this.db.homework.count({ where: { schoolId } })) === 0
        ) {
            const rows = classes.flatMap((schoolClass, index) => [
                {
                    schoolId,
                    classId: schoolClass.id,
                    subjectId: subjects[index % subjects.length].id,
                    teacherId: teachers[index % teachers.length].id,
                    title: `تمرین ${subjects[index % subjects.length].name}`,
                    dueOn: daysFromNow(3 + index),
                    published: index % 2 === 0,
                },
                {
                    schoolId,
                    classId: schoolClass.id,
                    subjectId: subjects[(index + 1) % subjects.length].id,
                    teacherId: teachers[(index + 1) % teachers.length].id,
                    title: `پروژه کلاسی ${schoolClass.name}`,
                    dueOn: daysFromNow(7 + index),
                    published: true,
                },
            ]);
            await this.db.homework.createMany({ data: rows });
            summary.homework = rows.length;
        }

        if (
            assignments.length &&
            (await this.db.assessment.count({ where: { schoolId } })) === 0
        ) {
            for (const [index, assignment] of assignments
                .slice(0, ASSIGNMENT_SAMPLE)
                .entries()) {
                const assessment = await this.db.assessment.create({
                    data: {
                        schoolId,
                        assignmentId: assignment.id,
                        title: index % 2 === 0 ? 'آزمون مستمر' : 'کوئیز کوتاه',
                        maximum: 20,
                        weight: index % 2 === 0 ? 1 : 0.5,
                        publishedAt: index % 3 === 0 ? daysAgo(2) : null,
                    },
                });
                summary.assessments += 1;
                const studentIds = (
                    studentsByClass.get(assignment.classId) ?? []
                ).slice(0, 15);
                if (!studentIds.length) continue;
                await this.db.mark.createMany({
                    data: studentIds.map((studentId, studentIndex) => ({
                        schoolId,
                        assessmentId: assessment.id,
                        studentId,
                        earned: 10 + (studentIndex % 11),
                        status:
                            studentIndex % 4 === 0
                                ? MarkStatus.DRAFT
                                : MarkStatus.PUBLISHED,
                    })),
                });
                summary.marks += studentIds.length;
            }
        }

        if (
            sampleStudents.length &&
            classes.length &&
            (await this.db.disciplineNote.count({ where: { schoolId } })) === 0
        ) {
            const rows = sampleStudents.slice(0, 10).map((student, index) => {
                const enrollment = enrollments.find(
                    row => row.studentId === student.id
                );
                return {
                    schoolId,
                    studentId: student.id,
                    classId: enrollment?.classId ?? classes[0].id,
                    title:
                        index % 2 === 0
                            ? 'تأخیر در ورود به کلاس'
                            : 'فراموشی تکلیف',
                    date: daysAgo(index + 1),
                };
            });
            await this.db.disciplineNote.createMany({ data: rows });
            summary.discipline = rows.length;
        }

        if ((await this.db.announcement.count({ where: { schoolId } })) === 0) {
            const announcements = [
                {
                    title: 'شروع سال تحصیلی',
                    body: 'به دانش‌آموزان و اولیا خوش آمد می‌گوییم.',
                    channel: MessageChannel.BOTH,
                    audience: { roles: ['GUARDIAN', 'STUDENT'] },
                    sentAt: daysAgo(10),
                },
                {
                    title: 'یادآوری قسط شهریه',
                    body: 'مهلت پرداخت قسط اول تا دو هفته دیگر است.',
                    channel: MessageChannel.SMS,
                    audience: { roles: ['GUARDIAN'] },
                    sentAt: daysAgo(2),
                },
                {
                    title: 'جلسه اولیا و مربیان',
                    body: 'جلسه در سالن مدرسه برگزار می‌شود.',
                    channel: MessageChannel.APP,
                    audience: { roles: ['GUARDIAN', 'TEACHER'] },
                    sentAt: null as Date | null,
                },
            ];
            for (const item of announcements) {
                const announcement = await this.db.announcement.create({
                    data: {
                        schoolId,
                        title: item.title,
                        body: item.body,
                        channel: item.channel,
                        audience: item.audience,
                        sentAt: item.sentAt,
                    },
                });
                summary.announcements += 1;
                if (item.sentAt && sampleStudents.length) {
                    await this.db.messageDelivery.createMany({
                        data: sampleStudents
                            .slice(0, 12)
                            .map((student, index) => ({
                                schoolId,
                                announcementId: announcement.id,
                                personId: student.id,
                                channel: item.channel,
                                status:
                                    index % 5 === 0
                                        ? DeliveryStatus.FAILED
                                        : DeliveryStatus.SENT,
                                sentAt: item.sentAt,
                                error: index % 5 === 0 ? 'شماره نامعتبر' : null,
                            })),
                    });
                }
            }
        }

        if (
            (await this.db.messageTemplate.count({ where: { schoolId } })) === 0
        ) {
            await this.db.messageTemplate.createMany({
                data: [
                    {
                        schoolId,
                        title: 'غیبت دانش‌آموز',
                        body: 'اولیای گرامی، فرزند شما امروز در مدرسه غایب بوده است.',
                        channel: MessageChannel.SMS,
                    },
                    {
                        schoolId,
                        title: 'یادآوری تکلیف',
                        body: 'لطفاً تکلیف امروز را تا فردا ارسال کنید.',
                        channel: MessageChannel.APP,
                    },
                ],
            });
            summary.templates = 2;
        }

        if (
            (await this.db.closure.count({
                where: { schoolId, yearId: year.id },
            })) === 0
        ) {
            await this.db.closure.createMany({
                data: [
                    {
                        schoolId,
                        yearId: year.id,
                        date: daysFromNow(20),
                        title: 'تعطیلی مناسبتی',
                    },
                    {
                        schoolId,
                        yearId: year.id,
                        date: daysFromNow(45),
                        title: 'جلسه شورای دبیران',
                    },
                ],
            });
            summary.closures = 2;
        }

        const staff = await this.db.person.findMany({
            where: { schoolId, kind: PersonKind.STAFF, deletedAt: null },
            take: 10,
        });
        if (
            staff.length &&
            (await this.db.staffAttendance.count({ where: { schoolId } })) === 0
        ) {
            const rows = [];
            for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
                for (const [index, person] of staff.entries()) {
                    rows.push({
                        schoolId,
                        personId: person.id,
                        date: daysAgo(dayOffset),
                        status:
                            index === 0 && dayOffset === 1
                                ? AttendanceStatus.LATE
                                : AttendanceStatus.PRESENT,
                    });
                }
            }
            await this.db.staffAttendance.createMany({
                data: rows,
                skipDuplicates: true,
            });
            summary.staffAttendance = rows.length;
        }

        if ((await this.db.importJob.count({ where: { schoolId } })) === 0) {
            await this.db.importJob.createMany({
                data: [
                    {
                        schoolId,
                        kind: ImportJobKind.PEOPLE,
                        status: ImportJobStatus.DONE,
                        totals: { rows: 40, created: 38, skipped: 2 },
                        errors: [],
                    },
                    {
                        schoolId,
                        kind: ImportJobKind.PEOPLE,
                        status: ImportJobStatus.FAILED,
                        totals: { rows: 10, created: 0, skipped: 0 },
                        errors: [{ row: 3, message: 'کد ملی تکراری است' }],
                    },
                ],
            });
            summary.importJobs = 2;
        }

        if ((await this.db.auditLog.count({ where: { schoolId } })) === 0) {
            const membership = await this.db.schoolMembership.findFirst({
                where: {
                    schoolId,
                    status: MembershipStatus.ACTIVE,
                    position: { baseRole: BaseRole.PRINCIPAL },
                },
            });
            if (membership) {
                await this.db.auditLog.createMany({
                    data: [
                        {
                            schoolId,
                            actorUserId: membership.userId,
                            actorMembershipId: membership.id,
                            action: 'seed.panel',
                            entity: 'school',
                            entityId: schoolId,
                            diff: { note: 'داده‌های نمایشی پنل' },
                        },
                        {
                            schoolId,
                            actorUserId: membership.userId,
                            actorMembershipId: membership.id,
                            action: 'finance.receipt.approve',
                            entity: 'receipt',
                            entityId: null,
                            diff: { count: 5 },
                        },
                    ],
                });
                summary.audit = 2;
            }
        }

        return summary;
    }
}

function daysAgo(n: number): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - n);
    return date;
}

function daysFromNow(n: number): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + n);
    return date;
}
