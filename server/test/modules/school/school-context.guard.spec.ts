import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { SchoolContextGuard } from 'src/modules/school/access/school-context.guard';
import { SchoolContextService } from 'src/modules/school/access/school-context.service';

describe('SchoolContextGuard', () => {
    let guard: SchoolContextGuard;
    const reflector = { getAllAndOverride: jest.fn() };
    const schoolContextService = { resolve: jest.fn() };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                SchoolContextGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: SchoolContextService,
                    useValue: schoolContextService,
                },
            ],
        }).compile();
        guard = module.get(SchoolContextGuard);
    });

    const context = (request: object) =>
        ({
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({ getRequest: () => request }),
        }) as never;

    it('allows public routes', async () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true);
        await expect(guard.canActivate(context({}))).resolves.toBe(true);
    });

    it('rejects missing user', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        await expect(
            guard.canActivate(context({ headers: {} }))
        ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects school tokens on global auth routes', async () => {
        reflector.getAllAndOverride
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);
        await expect(
            guard.canActivate(
                context({
                    user: { userId: 'u', typ: 'school' },
                    headers: {},
                })
            )
        ).rejects.toThrow(ForbiddenException);
    });

    it('allows global tokens on global auth routes', async () => {
        reflector.getAllAndOverride
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);
        await expect(
            guard.canActivate(
                context({
                    user: { userId: 'u', typ: 'global' },
                    headers: {},
                })
            )
        ).resolves.toBe(true);
    });

    it('rejects missing school claims', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        await expect(
            guard.canActivate(
                context({ user: { userId: 'u', typ: 'global' }, headers: {} })
            )
        ).rejects.toThrow(ForbiddenException);
    });

    it('resolves school context and reads year header arrays', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        schoolContextService.resolve.mockResolvedValue({ schoolId: 's' });
        const request: {
            user: object;
            headers: Record<string, string[]>;
            schoolContext?: unknown;
        } = {
            user: {
                userId: 'u',
                typ: 'school',
                schoolId: 's',
                membershipId: 'm',
                permVersion: 2,
            },
            headers: { 'x-year-id': ['y1'] },
        };
        await expect(guard.canActivate(context(request))).resolves.toBe(true);
        expect(schoolContextService.resolve).toHaveBeenCalledWith(
            'u',
            'm',
            's',
            2,
            'y1'
        );
        expect(request.schoolContext).toEqual({ schoolId: 's' });
    });

    it('uses undefined year when header is missing', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        schoolContextService.resolve.mockResolvedValue({});
        await guard.canActivate(
            context({
                user: {
                    userId: 'u',
                    typ: 'school',
                    schoolId: 's',
                    membershipId: 'm',
                },
                headers: {},
            })
        );
        expect(schoolContextService.resolve).toHaveBeenCalledWith(
            'u',
            'm',
            's',
            0,
            undefined
        );
    });
});
