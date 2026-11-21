import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { PermissionGuard } from 'src/modules/school/access/permission.guard';

describe('PermissionGuard', () => {
    let guard: PermissionGuard;
    const reflector = { getAllAndOverride: jest.fn() };

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                PermissionGuard,
                { provide: Reflector, useValue: reflector },
            ],
        }).compile();
        guard = module.get(PermissionGuard);
    });

    const context = (request: object) =>
        ({
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: () => ({ getRequest: () => request }),
        }) as never;

    it('allows when no permission is required', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        expect(guard.canActivate(context({}))).toBe(true);
    });

    it('allows when the actor has the permission', () => {
        reflector.getAllAndOverride.mockReturnValue('home.dashboard.view');
        expect(
            guard.canActivate(
                context({
                    schoolContext: { permissions: 'all' },
                })
            )
        ).toBe(true);
    });

    it('rejects when the actor lacks the permission', () => {
        reflector.getAllAndOverride.mockReturnValue('finance.receipts.approve');
        expect(() =>
            guard.canActivate(
                context({
                    schoolContext: { permissions: ['home.dashboard.view'] },
                })
            )
        ).toThrow(ForbiddenException);
    });
});
