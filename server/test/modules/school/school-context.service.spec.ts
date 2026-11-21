import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MembershipStatus } from '@prisma/client';

import { CacheService } from 'src/common/cache/services/cache.service';
import { DatabaseService } from 'src/common/database/services/database.service';
import { SchoolContextService } from 'src/modules/school/access/school-context.service';

describe('SchoolContextService', () => {
    let service: SchoolContextService;
    const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const db = {
        schoolMembership: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            updateMany: jest.fn(),
        },
        academicYear: { findFirst: jest.fn() },
    };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                SchoolContextService,
                { provide: CacheService, useValue: cache },
                { provide: DatabaseService, useValue: db },
            ],
        }).compile();
        service = module.get(SchoolContextService);
    });

    const membership = {
        schoolId: 's1',
        personId: 'p1',
        positionId: 'pos',
        permVersion: 1,
        status: MembershipStatus.ACTIVE,
        position: {
            isAll: false,
            permissions: [],
            baseRole: 'TEACHER',
        },
    };

    it('resolves from cache', async () => {
        cache.get.mockResolvedValue({
            schoolId: 's1',
            personId: 'p1',
            positionId: 'pos',
            baseRole: 'TEACHER',
            permissions: [],
            permVersion: 1,
            status: MembershipStatus.ACTIVE,
        });
        db.academicYear.findFirst.mockResolvedValue({ id: 'y1' });
        const ctx = await service.resolve('u', 'm', 's1', 1);
        expect(ctx.yearId).toBe('y1');
    });

    it('loads membership and uses stored permissions', async () => {
        cache.get.mockResolvedValue(null);
        db.schoolMembership.findUnique.mockResolvedValue({
            ...membership,
            position: {
                isAll: false,
                permissions: ['home.dashboard.view'],
                baseRole: 'STAFF',
            },
        });
        db.academicYear.findFirst.mockResolvedValue({ id: 'y1' });
        const ctx = await service.resolve('u', 'm', 's1', 1, 'y1');
        expect(ctx.permissions).toEqual(['home.dashboard.view']);
    });

    it('falls back to role grants when position permissions are empty', async () => {
        cache.get.mockResolvedValue(null);
        db.schoolMembership.findUnique.mockResolvedValue(membership);
        db.academicYear.findFirst.mockResolvedValue({ id: 'y1' });
        const ctx = await service.resolve('u', 'm', 's1', 1);
        expect(Array.isArray(ctx.permissions)).toBe(true);
        expect((ctx.permissions as string[]).length).toBeGreaterThan(0);
    });

    it('uses all permissions when isAll', async () => {
        cache.get.mockResolvedValue(null);
        db.schoolMembership.findUnique.mockResolvedValue({
            ...membership,
            position: { isAll: true, permissions: [], baseRole: 'PRINCIPAL' },
        });
        db.academicYear.findFirst.mockResolvedValue({ id: 'y1' });
        const ctx = await service.resolve('u', 'm', 's1', 1);
        expect(ctx.permissions).toBe('all');
    });

    it('rejects missing membership or mismatches', async () => {
        cache.get.mockResolvedValue(null);
        db.schoolMembership.findUnique.mockResolvedValue(null);
        await expect(service.resolve('u', 'm', 's1', 1)).rejects.toThrow(
            HttpException
        );
        cache.get.mockResolvedValue({
            schoolId: 'other',
            permVersion: 1,
            status: MembershipStatus.ACTIVE,
        });
        await expect(service.resolve('u', 'm', 's1', 1)).rejects.toThrow(
            HttpException
        );
        cache.get.mockResolvedValue({
            schoolId: 's1',
            permVersion: 2,
            status: MembershipStatus.ACTIVE,
        });
        await expect(service.resolve('u', 'm', 's1', 1)).rejects.toThrow(
            HttpException
        );
        cache.get.mockResolvedValue({
            schoolId: 's1',
            permVersion: 1,
            status: MembershipStatus.DEACTIVATED,
        });
        await expect(service.resolve('u', 'm', 's1', 1)).rejects.toThrow(
            HttpException
        );
    });

    it('rejects unknown year header and missing active year', async () => {
        cache.get.mockResolvedValue({
            schoolId: 's1',
            personId: 'p',
            positionId: 'pos',
            baseRole: 'TEACHER',
            permissions: [],
            permVersion: 1,
            status: MembershipStatus.ACTIVE,
        });
        db.academicYear.findFirst.mockResolvedValue(null);
        await expect(service.resolve('u', 'm', 's1', 1, 'bad')).rejects.toThrow(
            HttpException
        );
        await expect(service.resolve('u', 'm', 's1', 1)).rejects.toThrow(
            HttpException
        );
    });

    it('accepts a valid year header', async () => {
        cache.get.mockResolvedValue({
            schoolId: 's1',
            personId: 'p',
            positionId: 'pos',
            baseRole: 'TEACHER',
            permissions: [],
            permVersion: 1,
            status: MembershipStatus.ACTIVE,
        });
        db.academicYear.findFirst.mockResolvedValue({ id: 'y2' });
        const ctx = await service.resolve('u', 'm', 's1', 1, 'y2');
        expect(ctx.yearId).toBe('y2');
    });

    it('bumps perm versions and clears cache', async () => {
        db.schoolMembership.findMany.mockResolvedValue([
            { id: 'm1', permVersion: 3 },
        ]);
        await service.bumpPermVersion('s1', 'pos');
        expect(db.schoolMembership.updateMany).toHaveBeenCalled();
        expect(cache.del).toHaveBeenCalledWith('school:membership:m1:3');
    });
});
