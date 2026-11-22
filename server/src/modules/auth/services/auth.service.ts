import { createHash, randomBytes, randomInt } from 'crypto';

import { faker } from '@faker-js/faker';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { CacheService } from 'src/common/cache/services/cache.service';
import { UserRole } from 'src/common/database/enums/role.enum';
import { RefreshSessionRepository } from 'src/common/database/repositories/refresh-session.repository';
import { UserRepository } from 'src/common/database/repositories/user.repository';
import type { IAuthUser } from 'src/common/request/interfaces/request.interface';
import { normalizeIranPhone } from 'src/common/utils/iran-phone';

import { UserLoginDto } from '../dtos/auth.login.dto';
import {
    OtpSendDto,
    OtpVerifyDto,
    PasswordResetDto,
} from '../dtos/auth.otp.dto';
import {
    AuthRefreshResponseDto,
    AuthResponseDto,
    TokenDto,
} from '../dtos/auth.response.dto';
import { UserCreateDto } from '../dtos/auth.signup.dto';
import {
    SMS_PROVIDER,
    type SmsProvider,
} from '../interfaces/sms-provider.interface';

const OTP_PREFIX = 'otp';
const OTP_RESEND_PREFIX = 'otp:resend';
const OTP_PROOF_PREFIX = 'otp:proof';

@Injectable()
export class AuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly refreshSessionRepository: RefreshSessionRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly cache: CacheService,
        @Inject(SMS_PROVIDER) private readonly sms: SmsProvider
    ) {}

    async login({
        identifier,
        password,
    }: UserLoginDto): Promise<AuthResponseDto> {
        const user = await this.userRepository.findByIdentifier(identifier);
        if (!user || user.deletedAt) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }

        const matched = await argon2.verify(user.passwordHash, password);
        if (!matched) {
            throw new HttpException(
                'auth.error.invalidPassword',
                HttpStatus.BAD_REQUEST
            );
        }

        const tokens = await this.issueTokens({
            userId: user.id,
            role: user.role,
        });
        return { ...tokens, user };
    }

    async signup(data: UserCreateDto): Promise<AuthResponseDto> {
        if (await this.userRepository.existsByEmail(data.email)) {
            throw new HttpException(
                'user.error.userExists',
                HttpStatus.CONFLICT
            );
        }

        const hashed = await argon2.hash(data.password);
        const user = await this.userRepository.create({
            email: data.email,
            password: hashed,
            firstName: data.firstName?.trim() ?? null,
            lastName: data.lastName?.trim() ?? null,
            role: UserRole.MEMBER,
            userName: faker.internet.username(),
        });

        const tokens = await this.issueTokens({
            userId: user.id,
            role: user.role,
        });
        return { ...tokens, user };
    }

    async sendOtp({ phone, purpose }: OtpSendDto): Promise<{ sent: true }> {
        const mobile = normalizeIranPhone(phone);
        const resendKey = `${OTP_RESEND_PREFIX}:${purpose}:${mobile}`;
        if (await this.cache.exists(resendKey)) {
            throw new HttpException(
                'auth.error.otpResendTooSoon',
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
        const ttl = this.otpTtl();
        const code = String(randomInt(100000, 1000000));
        const payload = {
            hash: this.hashValue(code),
            attempts: 0,
        };
        await this.cache.set(
            `${OTP_PREFIX}:${purpose}:${mobile}`,
            payload,
            ttl
        );
        await this.cache.set(resendKey, '1', this.otpResend());
        await this.sms.send(mobile, `کد تایید دانیکا: ${code}`);
        return { sent: true };
    }

    async verifyOtp(
        data: OtpVerifyDto
    ): Promise<AuthResponseDto | { proof: string }> {
        const phone = normalizeIranPhone(data.phone);
        const key = `${OTP_PREFIX}:${data.purpose}:${phone}`;
        const stored = await this.cache.get<{ hash: string; attempts: number }>(
            key
        );
        if (!stored) {
            throw new HttpException(
                'auth.error.otpExpired',
                HttpStatus.BAD_REQUEST
            );
        }
        if (stored.attempts >= this.otpMaxAttempts()) {
            await this.cache.del(key);
            throw new HttpException(
                'auth.error.otpLocked',
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
        if (stored.hash !== this.hashValue(data.code)) {
            await this.cache.set(
                key,
                { ...stored, attempts: stored.attempts + 1 },
                this.otpTtl()
            );
            throw new HttpException(
                'auth.error.otpInvalid',
                HttpStatus.BAD_REQUEST
            );
        }
        await this.cache.del(key);

        if (data.purpose === 'reset') {
            const proof = randomBytes(24).toString('hex');
            await this.cache.set(
                `${OTP_PROOF_PREFIX}:${phone}`,
                this.hashValue(proof),
                600
            );
            return { proof };
        }

        const user = await this.userRepository.findByPhone(phone);
        if (!user || user.deletedAt) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        const tokens = await this.issueTokens({
            userId: user.id,
            role: user.role,
        });
        return { ...tokens, user };
    }

    async resetPassword(data: PasswordResetDto): Promise<{ success: true }> {
        const phone = normalizeIranPhone(data.phone);
        const key = `${OTP_PROOF_PREFIX}:${phone}`;
        const stored = await this.cache.get<string>(key);
        if (!stored || stored !== this.hashValue(data.proof)) {
            throw new HttpException(
                'auth.error.resetProofInvalid',
                HttpStatus.BAD_REQUEST
            );
        }
        const user = await this.userRepository.findByPhone(phone);
        if (!user) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        const passwordHash = await argon2.hash(data.password);
        await this.userRepository.update(user.id, { passwordHash });
        await this.refreshSessionRepository.revokeAllForUser(user.id);
        await this.cache.del(key);
        return { success: true };
    }

    async refreshTokens(payload: IAuthUser): Promise<AuthRefreshResponseDto> {
        if (!payload.sessionId) {
            throw new HttpException(
                'auth.error.refreshTokenUnauthorized',
                HttpStatus.UNAUTHORIZED
            );
        }
        const session = await this.refreshSessionRepository.findById(
            payload.sessionId
        );
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
            throw new HttpException(
                'auth.error.refreshTokenUnauthorized',
                HttpStatus.UNAUTHORIZED
            );
        }
        await this.refreshSessionRepository.revoke(session.id);
        const user = await this.userRepository.findById(payload.userId);
        if (!user || user.deletedAt) {
            throw new HttpException(
                'user.error.userNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return this.issueTokens({ userId: user.id, role: user.role });
    }

    async logout(
        userId: string,
        sessionId?: string
    ): Promise<{ success: true }> {
        if (sessionId) {
            const session =
                await this.refreshSessionRepository.findById(sessionId);
            if (session && session.userId === userId && !session.revokedAt) {
                await this.refreshSessionRepository.revoke(sessionId);
            }
            return { success: true };
        }
        await this.refreshSessionRepository.revokeAllForUser(userId);
        return { success: true };
    }

    issueSchoolAccessToken(claims: {
        userId: string;
        role: UserRole;
        schoolId: string;
        membershipId: string;
        permVersion: number;
    }): Promise<string> {
        return this.jwtService.signAsync(
            { ...claims, typ: 'school' },
            this.signOptions('accessToken')
        );
    }

    private async issueTokens(payload: IAuthUser): Promise<TokenDto> {
        const session = await this.refreshSessionRepository.create({
            userId: payload.userId,
            tokenHash: this.hashValue(randomBytes(32).toString('hex')),
            expiresAt: new Date(Date.now() + this.refreshTtlMs()),
        });
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { userId: payload.userId, role: payload.role, typ: 'global' },
                this.signOptions('accessToken')
            ),
            this.jwtService.signAsync(
                {
                    userId: payload.userId,
                    role: payload.role,
                    sessionId: session.id,
                    typ: 'refresh',
                },
                this.signOptions('refreshToken')
            ),
        ]);
        return { accessToken, refreshToken };
    }

    private signOptions(kind: 'accessToken' | 'refreshToken'): JwtSignOptions {
        return {
            secret: this.configService.getOrThrow<string>(
                `auth.${kind}.secret`
            ),
            expiresIn: this.configService.getOrThrow<string>(
                `auth.${kind}.tokenExp`
            ),
        } as JwtSignOptions;
    }

    private hashValue(value: string): string {
        return createHash('sha256').update(value).digest('hex');
    }

    private otpTtl(): number {
        return this.configService.get<number>('auth.otp.ttlSeconds') ?? 120;
    }

    private otpResend(): number {
        return this.configService.get<number>('auth.otp.resendSeconds') ?? 60;
    }

    private otpMaxAttempts(): number {
        return this.configService.get<number>('auth.otp.maxAttempts') ?? 5;
    }

    private refreshTtlMs(): number {
        return 7 * 24 * 60 * 60 * 1000;
    }
}
