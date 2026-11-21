import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BaseRole, ReceiptStatus } from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import type { SchoolContext } from 'src/modules/school/access/school-context';
import { ScopeService } from 'src/modules/school/access/scope.service';
import { SchoolFinanceService } from 'src/modules/school/finance/school-finance.service';

const ctx: SchoolContext = {
    userId: 'u',
    schoolId: 's',
    membershipId: 'm',
    personId: 'p',
    positionId: 'pos',
    baseRole: BaseRole.FINANCE,
    permissions: 'all',
    permVersion: 1,
    yearId: 'y',
};

describe('SchoolFinanceService', () => {
    let service: SchoolFinanceService;
    const db: Record<string, Record<string, jest.Mock>> = {
        tuitionPlan: {
            findMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        charge: {
            findMany: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
            aggregate: jest.fn(),
        },
        chargeBatch: { create: jest.fn() },
        enrollment: { findMany: jest.fn() },
        person: { findFirst: jest.fn() },
        receipt: {
            findMany: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            aggregate: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const scope = { financialStudentIds: jest.fn() };

    beforeEach(async () => {
        db.$transaction.mockImplementation(async (arg: unknown) => {
            if (typeof arg === 'function') {
                return (arg as (tx: typeof db) => Promise<unknown>)(db);
            }
            return Promise.all(arg as Promise<unknown>[]);
        });
        const module = await Test.createTestingModule({
            providers: [
                SchoolFinanceService,
                { provide: DatabaseService, useValue: db },
                { provide: ScopeService, useValue: scope },
            ],
        }).compile();
        service = module.get(SchoolFinanceService);
    });

    it('plans and charges', async () => {
        db.tuitionPlan.findMany.mockResolvedValue([
            { amountIrr: 10n, grade: { name: 'g' } },
        ]);
        await service.plans(ctx);
        db.tuitionPlan.create.mockResolvedValue({});
        await service.createPlan(ctx, {
            gradeId: 'g',
            title: 't',
            amountIrr: '10',
        });
        db.tuitionPlan.findFirst.mockResolvedValue(null);
        await expect(service.updatePlan(ctx, 'x', {})).rejects.toThrow(
            HttpException
        );
        db.tuitionPlan.findFirst.mockResolvedValue({ id: 'p' });
        db.tuitionPlan.update.mockResolvedValue({});
        await service.updatePlan(ctx, 'p', { title: 'n' });
        await service.updatePlan(ctx, 'p', { amountIrr: '20' });
        scope.financialStudentIds.mockResolvedValue(null);
        db.$transaction.mockResolvedValueOnce([[{ amountIrr: 1n }], 1]);
        await service.charges(ctx, { page: 1, limit: 20 });
        scope.financialStudentIds.mockResolvedValue(['st']);
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.charges(ctx, { page: 1, limit: 20 });
        db.charge.create.mockResolvedValue({});
        await service.createCharge(ctx, {
            studentId: 'st',
            title: 't',
            amountIrr: '1',
        });
        await service.createCharge(ctx, {
            studentId: 'st',
            title: 't',
            amountIrr: '1',
            dueOn: '2026-01-01',
            planId: 'p',
        });
    });

    it('batch charges by class, grade, plan and empty enrollments', async () => {
        db.tuitionPlan.findFirst.mockResolvedValue({
            id: 'p',
            amountIrr: 5n,
        });
        db.enrollment.findMany.mockResolvedValue([]);
        db.chargeBatch.create.mockResolvedValue({ id: 'b' });
        await expect(
            service.batchCharges(ctx, {
                title: 't',
                dueOn: '2026-01-01',
                planId: 'p',
                classId: 'c',
            })
        ).resolves.toEqual({ batch: { id: 'b' }, count: 0 });
        db.enrollment.findMany.mockResolvedValue([{ studentId: 'st' }]);
        await service.batchCharges(ctx, {
            title: 't',
            dueOn: '2026-01-01',
            gradeId: 'g',
            amountIrr: '3',
        });
        await service.batchCharges(ctx, {
            title: 't',
            dueOn: '2026-01-01',
        });
    });

    it('receipts approve reverse ledger reports csv', async () => {
        scope.financialStudentIds.mockResolvedValue(null);
        db.$transaction.mockResolvedValueOnce([[{ amountIrr: 1n }], 1]);
        await service.receipts(ctx, { page: 1, limit: 20 });
        scope.financialStudentIds.mockResolvedValue(['st']);
        db.$transaction.mockResolvedValueOnce([[], 0]);
        await service.receipts(ctx, { page: 1, limit: 20 });
        db.receipt.create.mockResolvedValue({});
        await service.createReceipt(ctx, {
            studentId: 'st',
            amountIrr: '1',
            ref: 'r',
            date: '2026-01-01',
        });
        db.receipt.findFirst.mockResolvedValue(null);
        await expect(service.approveReceipt(ctx, 'r')).rejects.toThrow(
            HttpException
        );
        await expect(service.reverseReceipt(ctx, 'r')).rejects.toThrow(
            HttpException
        );
        db.receipt.findFirst.mockResolvedValue({
            id: 'r',
            status: ReceiptStatus.POSTED,
            studentId: 'st',
            amountIrr: 1n,
        });
        await expect(service.approveReceipt(ctx, 'r')).rejects.toThrow(
            HttpException
        );
        db.receipt.findFirst.mockResolvedValue({
            id: 'r',
            status: ReceiptStatus.PENDING,
            studentId: 'st',
            amountIrr: 100n,
        });
        db.charge.aggregate.mockResolvedValue({ _sum: { amountIrr: 10n } });
        db.receipt.aggregate.mockResolvedValue({ _sum: { amountIrr: 0n } });
        await expect(service.approveReceipt(ctx, 'r')).rejects.toThrow(
            HttpException
        );
        db.receipt.findFirst.mockResolvedValue({
            id: 'r',
            status: ReceiptStatus.PENDING,
            studentId: 'st',
            amountIrr: 5n,
        });
        db.charge.aggregate.mockResolvedValue({ _sum: { amountIrr: null } });
        db.receipt.aggregate.mockResolvedValue({ _sum: { amountIrr: null } });
        db.receipt.update.mockResolvedValue({});
        await expect(service.approveReceipt(ctx, 'r')).rejects.toThrow(
            HttpException
        );
        db.charge.aggregate.mockResolvedValue({ _sum: { amountIrr: 10n } });
        db.receipt.findFirst.mockResolvedValue({
            id: 'r',
            status: ReceiptStatus.PENDING,
            studentId: 'st',
            amountIrr: 5n,
        });
        await service.approveReceipt(ctx, 'r');
        db.receipt.findFirst.mockResolvedValue({
            id: 'r',
            status: ReceiptStatus.PENDING,
            studentId: 'st',
        });
        await expect(service.reverseReceipt(ctx, 'r')).rejects.toThrow(
            HttpException
        );
        db.receipt.findFirst.mockResolvedValue({
            id: 'r',
            status: ReceiptStatus.POSTED,
            studentId: 'st',
        });
        await service.reverseReceipt(ctx, 'r');
        scope.financialStudentIds.mockResolvedValue(['other']);
        await expect(service.ledger(ctx, 'st')).rejects.toThrow(HttpException);
        scope.financialStudentIds.mockResolvedValue(null);
        db.charge.findMany.mockResolvedValue([{ amountIrr: 2n }]);
        db.receipt.findMany.mockResolvedValue([{ amountIrr: 1n }]);
        db.person.findFirst.mockResolvedValue({
            firstName: 'A',
            lastName: 'B',
        });
        db.charge.aggregate.mockResolvedValue({ _sum: { amountIrr: 1n } });
        db.receipt.aggregate.mockResolvedValue({ _sum: { amountIrr: 0n } });
        await service.ledger(ctx, 'st');
        db.person.findFirst.mockResolvedValue(null);
        await service.ledger(ctx, 'st');
        db.charge.aggregate.mockResolvedValue({ _sum: { amountIrr: null } });
        db.receipt.aggregate.mockResolvedValue({ _sum: { amountIrr: null } });
        db.charge.findMany.mockResolvedValue([
            { studentId: 'st', amountIrr: 10n, dueOn: new Date('2026-02-01') },
            { studentId: 'st2', amountIrr: 5n, dueOn: null },
        ]);
        db.receipt.findMany.mockResolvedValue([
            { studentId: 'st', amountIrr: 4n, date: new Date('2026-02-10') },
            { studentId: 'st3', amountIrr: 1n, date: new Date('2026-03-10') },
        ]);
        const reports = await service.reports(ctx);
        expect(reports.debtors.length).toBeGreaterThan(0);
        const csv = await service.exportCsv(ctx);
        expect(csv).toContain('month,due,collected');
    });
});
