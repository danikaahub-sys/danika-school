import {
    allPermissionKeys,
    CATALOG,
    canRole,
    hasPermission,
    permissionsForRole,
    prismaRoleToCatalog,
    ROLE_GRANTS,
} from 'src/modules/school/access/permission.catalog';

import {
    CATALOG as UiCatalog,
    ROLE_GRANTS as UiGrants,
    allPermissionKeys as uiKeys,
} from '../../../../school/src/features/access/permissions';

describe('permission catalog parity', () => {
    it('mirrors the UI catalog keys', () => {
        expect(CATALOG).toEqual(UiCatalog);
        expect(allPermissionKeys().sort()).toEqual(uiKeys().sort());
        expect(Object.keys(ROLE_GRANTS).sort()).toEqual(
            Object.keys(UiGrants).sort()
        );
        for (const role of Object.keys(ROLE_GRANTS) as Array<
            keyof typeof ROLE_GRANTS
        >) {
            expect([...ROLE_GRANTS[role]].sort()).toEqual(
                [...UiGrants[role]].sort()
            );
        }
    });

    it('hasPermission and canRole', () => {
        expect(hasPermission('all', 'home.dashboard.view')).toBe(true);
        expect(hasPermission(undefined, 'home.dashboard.view')).toBe(false);
        expect(
            hasPermission(['home.dashboard.view'], 'home.dashboard.view')
        ).toBe(true);
        expect(hasPermission([], 'home.dashboard.view')).toBe(false);
        expect(canRole('teacher', 'classroom.workspace.view')).toBe(true);
        expect(canRole('student', 'finance.receipts.approve')).toBe(false);
        expect(permissionsForRole('principal').length).toBeGreaterThan(0);
        expect(prismaRoleToCatalog('TEACHER')).toBe('teacher');
    });
});
