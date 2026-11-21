export const ACTIONS = [
    'view',
    'create',
    'edit',
    'archive',
    'publish',
    'approve',
    'export',
] as const;

export type Action = (typeof ACTIONS)[number];

export const BASE_ROLES = [
    'principal',
    'deputy',
    'teacher',
    'finance',
    'counselor',
    'staff',
    'guardian',
    'student',
] as const;

export type CatalogBaseRole = (typeof BASE_ROLES)[number];

export const CATALOG = {
    home: { dashboard: ['view'] },
    setup: { school: ['view', 'edit'] },
    people: {
        directory: ['view', 'create', 'edit', 'export', 'archive'],
        import: ['view', 'create'],
        guardians: ['view', 'edit', 'approve'],
    },
    classroom: {
        workspace: ['view', 'edit'],
        attendance: ['view', 'create', 'edit'],
        grades: ['view', 'edit', 'publish'],
        reports: ['view', 'export'],
    },
    finance: {
        ledger: ['view', 'create', 'edit'],
        receipts: ['view', 'create', 'approve'],
        charges: ['view', 'create'],
        reports: ['view', 'export'],
    },
    communications: {
        compose: ['view', 'create'],
        log: ['view'],
    },
    admin: {
        users: ['view', 'create', 'edit'],
        positions: ['view', 'edit'],
        settings: ['view', 'edit'],
        audit: ['view'],
    },
    stubs: {
        exams: ['view'],
        online: ['view'],
        admissions: ['view'],
        website: ['view'],
    },
} as const;

type Catalog = typeof CATALOG;
export type ModuleId = keyof Catalog;
export type PermissionKey = {
    [M in ModuleId]: {
        [P in keyof Catalog[M]]: Catalog[M][P] extends readonly (infer A)[]
            ? A extends string
                ? `${M & string}.${P & string}.${A}`
                : never
            : never;
    }[keyof Catalog[M]];
}[ModuleId];

export type PermissionSet = PermissionKey[] | 'all';

export function allPermissionKeys(): PermissionKey[] {
    const keys: PermissionKey[] = [];
    for (const [mod, pages] of Object.entries(CATALOG)) {
        for (const [page, actions] of Object.entries(pages)) {
            for (const action of actions) {
                keys.push(`${mod}.${page}.${action}` as PermissionKey);
            }
        }
    }
    return keys;
}

const ALL_KEYS = allPermissionKeys();

function expand(
    grants: Array<PermissionKey | `${ModuleId}.*` | 'all'>
): PermissionKey[] {
    const set = new Set<PermissionKey>();
    for (const grant of grants) {
        if (grant === 'all') {
            ALL_KEYS.forEach(key => set.add(key));
            continue;
        }
        if (grant.endsWith('.*')) {
            const prefix = grant.slice(0, -1);
            ALL_KEYS.filter(key => key.startsWith(prefix)).forEach(key =>
                set.add(key)
            );
            continue;
        }
        set.add(grant as PermissionKey);
    }
    return [...set];
}

export const ROLE_GRANTS: Record<CatalogBaseRole, PermissionKey[]> = {
    principal: expand(['all']),
    deputy: expand([
        'home.*',
        'setup.*',
        'people.*',
        'classroom.*',
        'communications.*',
        'admin.users.view',
        'admin.audit.view',
        'stubs.admissions.view',
    ]),
    teacher: expand([
        'home.dashboard.view',
        'classroom.*',
        'people.directory.view',
        'communications.compose.view',
        'setup.school.view',
    ]),
    finance: expand([
        'home.dashboard.view',
        'finance.*',
        'people.directory.view',
        'people.directory.export',
        'communications.compose.view',
    ]),
    counselor: expand([
        'home.dashboard.view',
        'people.directory.view',
        'people.guardians.view',
        'classroom.workspace.view',
        'communications.compose.view',
    ]),
    staff: expand(['home.dashboard.view', 'communications.compose.view']),
    guardian: expand([
        'home.dashboard.view',
        'classroom.workspace.view',
        'classroom.grades.view',
        'communications.compose.view',
        'finance.ledger.view',
    ]),
    student: expand([
        'home.dashboard.view',
        'classroom.workspace.view',
        'classroom.grades.view',
        'communications.compose.view',
    ]),
};

export function permissionsForRole(role: CatalogBaseRole): PermissionKey[] {
    return ROLE_GRANTS[role];
}

export function hasPermission(
    permissions: PermissionSet | undefined,
    key: PermissionKey
): boolean {
    if (permissions === 'all') return true;
    if (!permissions) return false;
    return permissions.includes(key);
}

export function canRole(role: CatalogBaseRole, key: PermissionKey): boolean {
    return hasPermission(ROLE_GRANTS[role], key);
}

export function prismaRoleToCatalog(role: string): CatalogBaseRole {
    return role.toLowerCase() as CatalogBaseRole;
}
