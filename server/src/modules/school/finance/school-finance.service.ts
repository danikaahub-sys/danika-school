import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ReceiptStatus } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import {
    paginate,
    PaginationQueryDto,
    skipTake,
} from 'src/common/pagination/pagination.dto';

import type { SchoolContext } from '../access/school-context';
import { ScopeService } from '../access/scope.service';

function money(value: bigint | number | string): string {
    return String(value);
}

@Injectable()
export class SchoolFinanceService {
    constructor(
        private readonly db: DatabaseService,
        private readonly scope: ScopeService
    ) {}

    async plans(ctx: SchoolContext) {
        const plans = await this.db.tuitionPlan.findMany({
            where: { schoolId: ctx.schoolId, yearId: ctx.yearId },
            include: { grade: true },
            orderBy: { createdAt: 'desc' },
        });
        return plans.map(plan => ({
            ...plan,
            amountIrr: money(plan.amountIrr),
        }));
    }

    createPlan(
        ctx: SchoolContext,
        data: { gradeId: string; title: string; amountIrr: string }
    ) {
        return this.db.tuitionPlan.create({
            data: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                gradeId: data.gradeId,
                title: data.title,
                amountIrr: BigInt(data.amountIrr),
            },
        });
    }

    async updatePlan(
        ctx: SchoolContext,
        id: string,
        data: { title?: string; amountIrr?: string }
    ) {
        await this.assertPlan(ctx, id);
        return this.db.tuitionPlan.update({
            where: { id },
            data: {
                title: data.title,
                amountIrr:
                    data.amountIrr !== undefined
                        ? BigInt(data.amountIrr)
                        : undefined,
            },
        });
    }

    async charges(ctx: SchoolContext, query: PaginationQueryDto) {
        const studentIds = await this.scope.financialStudentIds(ctx);
        const where = {
            schoolId: ctx.schoolId,
            yearId: ctx.yearId,
            ...(studentIds ? { studentId: { in: studentIds } } : {}),
        };
        const { skip, take } = skipTake(query);
        const [items, total] = await this.db.$transaction([
            this.db.charge.findMany({
                where,
                skip,
                take,
                include: { student: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.db.charge.count({ where }),
        ]);
        return paginate(
            items.map(item => ({ ...item, amountIrr: money(item.amountIrr) })),
            total,
            query
        );
    }

    createCharge(
        ctx: SchoolContext,
        data: {
            studentId: string;
            title: string;
            amountIrr: string;
            dueOn?: string;
            planId?: string;
        }
    ) {
        return this.db.charge.create({
            data: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                studentId: data.studentId,
                title: data.title,
                amountIrr: BigInt(data.amountIrr),
                dueOn: data.dueOn ? new Date(data.dueOn) : null,
                planId: data.planId,
            },
        });
    }

    async batchCharges(
        ctx: SchoolContext,
        data: {
            title: string;
            amountIrr?: string;
            dueOn: string;
            gradeId?: string;
            classId?: string;
            planId?: string;
        }
    ) {
        const plan = data.planId
            ? await this.assertPlan(ctx, data.planId)
            : null;
        const amount = plan ? plan.amountIrr : BigInt(data.amountIrr ?? '0');
        const classFilter = data.classId
            ? { classId: data.classId }
            : data.gradeId
              ? { class: { gradeId: data.gradeId } }
              : {};
        const enrollments = await this.db.enrollment.findMany({
            where: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                ...classFilter,
            },
        });
        const batch = await this.db.chargeBatch.create({
            data: {
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                title: data.title,
                dueOn: new Date(data.dueOn),
            },
        });
        if (enrollments.length === 0) {
            return { batch, count: 0 };
        }
        await this.db.charge.createMany({
            data: enrollments.map(item => ({
                schoolId: ctx.schoolId,
                yearId: ctx.yearId,
                studentId: item.studentId,
                title: data.title,
                amountIrr: amount,
                dueOn: new Date(data.dueOn),
                planId: data.planId,
                batchId: batch.id,
            })),
        });
        return { batch, count: enrollments.length };
    }

    async receipts(ctx: SchoolContext, query: PaginationQueryDto) {
        const studentIds = await this.scope.financialStudentIds(ctx);
        const where = {
            schoolId: ctx.schoolId,
            ...(studentIds ? { studentId: { in: studentIds } } : {}),
        };
        const { skip, take } = skipTake(query);
        const [items, total] = await this.db.$transaction([
            this.db.receipt.findMany({
                where,
                skip,
                take,
                include: { student: true },
                orderBy: { date: 'desc' },
            }),
            this.db.receipt.count({ where }),
        ]);
        return paginate(
            items.map(item => ({ ...item, amountIrr: money(item.amountIrr) })),
            total,
            query
        );
    }

    createReceipt(
        ctx: SchoolContext,
        data: {
            studentId: string;
            amountIrr: string;
            ref: string;
            date: string;
        }
    ) {
        return this.db.receipt.create({
            data: {
                schoolId: ctx.schoolId,
                studentId: data.studentId,
                amountIrr: BigInt(data.amountIrr),
                ref: data.ref,
                date: new Date(data.date),
                status: ReceiptStatus.PENDING,
            },
        });
    }

    async approveReceipt(ctx: SchoolContext, id: string) {
        return this.db.$transaction(async tx => {
            const receipt = await tx.receipt.findFirst({
                where: { id, schoolId: ctx.schoolId },
            });
            if (!receipt) {
                throw new HttpException(
                    'school.error.receiptNotFound',
                    HttpStatus.NOT_FOUND
                );
            }
            if (receipt.status !== ReceiptStatus.PENDING) {
                throw new HttpException(
                    'school.error.receiptNotPending',
                    HttpStatus.CONFLICT
                );
            }
            const balance = await this.studentBalance(
                ctx,
                receipt.studentId,
                tx
            );
            if (receipt.amountIrr > balance) {
                throw new HttpException(
                    'school.error.receiptExceedsBalance',
                    HttpStatus.BAD_REQUEST
                );
            }
            return tx.receipt.update({
                where: { id },
                data: {
                    status: ReceiptStatus.POSTED,
                    approvedById: ctx.userId,
                },
            });
        });
    }

    async reverseReceipt(ctx: SchoolContext, id: string) {
        return this.db.$transaction(async tx => {
            const receipt = await tx.receipt.findFirst({
                where: { id, schoolId: ctx.schoolId },
            });
            if (!receipt) {
                throw new HttpException(
                    'school.error.receiptNotFound',
                    HttpStatus.NOT_FOUND
                );
            }
            if (receipt.status !== ReceiptStatus.POSTED) {
                throw new HttpException(
                    'school.error.receiptNotPosted',
                    HttpStatus.CONFLICT
                );
            }
            return tx.receipt.update({
                where: { id },
                data: {
                    status: ReceiptStatus.REVERSED,
                    reversedById: ctx.userId,
                },
            });
        });
    }

    async ledger(ctx: SchoolContext, studentId: string) {
        const allowed = await this.scope.financialStudentIds(ctx);
        if (allowed && !allowed.includes(studentId)) {
            throw new HttpException(
                'school.error.personNotFound',
                HttpStatus.FORBIDDEN
            );
        }
        const [charges, receipts, person] = await Promise.all([
            this.db.charge.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    studentId,
                },
                orderBy: { createdAt: 'asc' },
            }),
            this.db.receipt.findMany({
                where: { schoolId: ctx.schoolId, studentId },
                orderBy: { date: 'asc' },
            }),
            this.db.person.findFirst({
                where: { id: studentId, schoolId: ctx.schoolId },
            }),
        ]);
        const balance = await this.studentBalance(ctx, studentId);
        return {
            studentName: person
                ? `${person.firstName} ${person.lastName}`.trim()
                : '',
            charges: charges.map(item => ({
                ...item,
                amountIrr: money(item.amountIrr),
            })),
            receipts: receipts.map(item => ({
                ...item,
                amountIrr: money(item.amountIrr),
            })),
            balance: money(balance),
        };
    }

    async reports(ctx: SchoolContext) {
        const [chargeAgg, receiptAgg, charges, receipts] = await Promise.all([
            this.db.charge.aggregate({
                where: { schoolId: ctx.schoolId, yearId: ctx.yearId },
                _sum: { amountIrr: true },
            }),
            this.db.receipt.aggregate({
                where: {
                    schoolId: ctx.schoolId,
                    status: ReceiptStatus.POSTED,
                },
                _sum: { amountIrr: true },
            }),
            this.db.charge.findMany({
                where: { schoolId: ctx.schoolId, yearId: ctx.yearId },
                select: { studentId: true, amountIrr: true, dueOn: true },
            }),
            this.db.receipt.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    status: ReceiptStatus.POSTED,
                },
                select: { studentId: true, amountIrr: true, date: true },
            }),
        ]);
        const due = chargeAgg._sum.amountIrr ?? 0n;
        const collected = receiptAgg._sum.amountIrr ?? 0n;
        const byMonth = new Map<string, { due: bigint; collected: bigint }>();
        for (const charge of charges) {
            const key = (charge.dueOn ?? new Date()).toISOString().slice(0, 7);
            const row = byMonth.get(key) ?? { due: 0n, collected: 0n };
            row.due += charge.amountIrr;
            byMonth.set(key, row);
        }
        for (const receipt of receipts) {
            const key = receipt.date.toISOString().slice(0, 7);
            const row = byMonth.get(key) ?? { due: 0n, collected: 0n };
            row.collected += receipt.amountIrr;
            byMonth.set(key, row);
        }
        const paid = new Map<string, bigint>();
        for (const receipt of receipts) {
            paid.set(
                receipt.studentId,
                (paid.get(receipt.studentId) ?? 0n) + receipt.amountIrr
            );
        }
        const owed = new Map<string, bigint>();
        for (const charge of charges) {
            owed.set(
                charge.studentId,
                (owed.get(charge.studentId) ?? 0n) + charge.amountIrr
            );
        }
        const debtors = [...owed.entries()]
            .map(([studentId, total]) => ({
                studentId,
                balance: total - (paid.get(studentId) ?? 0n),
            }))
            .filter(item => item.balance > 0n)
            .map(item => ({
                studentId: item.studentId,
                balance: money(item.balance),
            }));
        return {
            totals: {
                due: money(due),
                collected: money(collected),
                outstanding: money(due - collected),
            },
            byMonth: [...byMonth.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, row]) => ({
                    month,
                    due: money(row.due),
                    collected: money(row.collected),
                })),
            debtors,
        };
    }

    async exportCsv(ctx: SchoolContext) {
        const report = await this.reports(ctx);
        const lines = [
            'month,due,collected',
            ...report.byMonth.map(
                row => `${row.month},${row.due},${row.collected}`
            ),
            '',
            'studentId,balance',
            ...report.debtors.map(row => `${row.studentId},${row.balance}`),
        ];
        return lines.join('\n');
    }

    private async assertPlan(ctx: SchoolContext, id: string) {
        const plan = await this.db.tuitionPlan.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
        if (!plan) {
            throw new HttpException(
                'school.error.planNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return plan;
    }

    private async studentBalance(
        ctx: SchoolContext,
        studentId: string,
        client: Pick<DatabaseService, 'charge' | 'receipt'> = this.db
    ) {
        const [charges, receipts] = await Promise.all([
            client.charge.aggregate({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    studentId,
                },
                _sum: { amountIrr: true },
            }),
            client.receipt.aggregate({
                where: {
                    schoolId: ctx.schoolId,
                    studentId,
                    status: ReceiptStatus.POSTED,
                },
                _sum: { amountIrr: true },
            }),
        ]);
        return (charges._sum.amountIrr ?? 0n) - (receipts._sum.amountIrr ?? 0n);
    }
}
