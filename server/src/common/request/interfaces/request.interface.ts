import { type UserRole } from 'src/common/database/enums/role.enum';

export type AuthTokenType = 'global' | 'school' | 'refresh';

export interface IAuthUser {
    userId: string;
    role: UserRole;
    typ?: AuthTokenType;
    schoolId?: string;
    membershipId?: string;
    permVersion?: number;
    sessionId?: string;
}

export interface IRequest {
    user: IAuthUser;
}
