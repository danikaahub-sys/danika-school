import type { BaseRole } from '@prisma/client';

import type { PermissionKey } from './permission.catalog';

export type SchoolContext = {
    userId: string;
    schoolId: string;
    membershipId: string;
    personId: string;
    positionId: string;
    baseRole: BaseRole;
    permissions: PermissionKey[] | 'all';
    permVersion: number;
    yearId: string;
};
