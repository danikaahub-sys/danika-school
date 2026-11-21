import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { IAuthUser } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh'
) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>(
                'auth.refreshToken.secret'
            ),
        });
    }

    validate(payload: Record<string, string | number>): IAuthUser {
        return {
            userId: String(payload.userId),
            role: payload.role as IAuthUser['role'],
            typ: 'refresh',
            sessionId: payload.sessionId
                ? String(payload.sessionId)
                : undefined,
        };
    }
}
