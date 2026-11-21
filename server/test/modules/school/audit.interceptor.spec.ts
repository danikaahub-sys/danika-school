import { of, firstValueFrom } from 'rxjs';

import { AuditInterceptor } from 'src/modules/school/access/audit.interceptor';

describe('AuditInterceptor', () => {
    const db = { auditLog: { create: jest.fn() } };
    const interceptor = new AuditInterceptor(db as never);

    const context = (request: object) =>
        ({
            switchToHttp: () => ({ getRequest: () => request }),
        }) as never;

    it('skips GET requests', async () => {
        const result = interceptor.intercept(
            context({ method: 'GET', url: '/x' }),
            { handle: () => of('ok') } as never
        );
        await expect(firstValueFrom(result)).resolves.toBe('ok');
        expect(db.auditLog.create).not.toHaveBeenCalled();
    });

    it('skips mutations without school context', async () => {
        const result = interceptor.intercept(
            context({ method: 'POST', url: '/x' }),
            { handle: () => of('ok') } as never
        );
        await expect(firstValueFrom(result)).resolves.toBe('ok');
        expect(db.auditLog.create).not.toHaveBeenCalled();
    });

    it('writes an audit row after a mutation', async () => {
        db.auditLog.create.mockResolvedValue({});
        const result = interceptor.intercept(
            context({
                method: 'POST',
                url: '/v1/school/people',
                schoolContext: {
                    schoolId: 's',
                    userId: 'u',
                    membershipId: 'm',
                },
                params: { id: 'p1' },
                body: { name: 'a' },
            }),
            { handle: () => of('ok') } as never
        );
        await expect(firstValueFrom(result)).resolves.toBe('ok');
        expect(db.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                schoolId: 's',
                entity: 'record',
                entityId: 'p1',
            }),
        });
    });

    it('uses collection entity when no id param', async () => {
        const result = interceptor.intercept(
            context({
                method: 'PUT',
                url: '/v1/school/setup',
                schoolContext: {
                    schoolId: 's',
                    userId: 'u',
                    membershipId: 'm',
                },
                params: {},
            }),
            { handle: () => of('ok') } as never
        );
        await firstValueFrom(result);
        expect(db.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                entity: 'collection',
                entityId: null,
            }),
        });
    });
});
