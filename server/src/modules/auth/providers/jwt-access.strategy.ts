import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { IAuthUser } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
    Strategy,
    'jwt-access'
) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>(
                'auth.accessToken.secret'
            ),
        });
    }

    validate(payload: Record<string, string | number>): IAuthUser {
        return {
            userId: String(payload.userId),
            role: payload.role as IAuthUser['role'],
            typ: (payload.typ as IAuthUser['typ']) ?? 'global',
            schoolId: payload.schoolId ? String(payload.schoolId) : undefined,
            membershipId: payload.membershipId
                ? String(payload.membershipId)
                : undefined,
            permVersion:
                payload.permVersion !== undefined
                    ? Number(payload.permVersion)
                    : undefined,
            sessionId: payload.sessionId
                ? String(payload.sessionId)
                : undefined,
        };
    }
}
