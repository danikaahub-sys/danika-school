import { createHash } from 'node:crypto';

import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';

import { CacheService } from 'src/common/cache/services/cache.service';
import { UserRole as Role } from 'src/common/database/enums/role.enum';
import { RefreshSessionRepository } from 'src/common/database/repositories/refresh-session.repository';
import { UserRepository } from 'src/common/database/repositories/user.repository';
import { SMS_PROVIDER } from 'src/modules/auth/interfaces/sms-provider.interface';
import { AuthService } from 'src/modules/auth/services/auth.service';

jest.mock('argon2', () => ({
    hash: jest.fn(),
    verify: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;

    const mockUserRepository = {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findByPhone: jest.fn(),
        findByIdentifier: jest.fn(),
        existsById: jest.fn(),
        existsByEmail: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        softDelete: jest.fn(),
        hardDeleteByEmail: jest.fn(),
    };
    const mockRefresh = {
        create: jest.fn().mockResolvedValue({ id: 'sess-1' }),
        findById: jest.fn(),
        revoke: jest.fn(),
        revokeAllForUser: jest.fn(),
    };
    const mockJwtService = { signAsync: jest.fn() };
    const mockConfigService = {
        getOrThrow: jest.fn((key: string) => {
            const map: Record<string, string> = {
                'auth.accessToken.secret': 'access-secret',
                'auth.accessToken.tokenExp': '1d',
                'auth.refreshToken.secret': 'refresh-secret',
                'auth.refreshToken.tokenExp': '7d',
            };
            return map[key];
        }),
        get: jest.fn(),
    };
    const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
    };
    const mockSms = { send: jest.fn() };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserRepository, useValue: mockUserRepository },
                { provide: RefreshSessionRepository, useValue: mockRefresh },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: CacheService, useValue: mockCache },
                { provide: SMS_PROVIDER, useValue: mockSms },
            ],
        }).compile();
        service = module.get(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('login', () => {
        it('throws when user is not found', async () => {
            mockUserRepository.findByIdentifier.mockResolvedValue(null);
            await expect(
                service.login({
                    identifier: 'test@example.com',
                    password: 'Password1!',
                })
            ).rejects.toThrow(HttpException);
        });

        it('throws when user is deleted', async () => {
            mockUserRepository.findByIdentifier.mockResolvedValue({
                id: '1',
                deletedAt: new Date(),
                passwordHash: 'x',
            });
            await expect(
                service.login({
                    identifier: 'a@b.com',
                    password: 'Password1!',
                })
            ).rejects.toThrow(HttpException);
        });

        it('throws when password does not match', async () => {
            mockUserRepository.findByIdentifier.mockResolvedValue({
                id: '123',
                passwordHash: 'hashed',
                role: Role.MEMBER,
            });
            (argon2.verify as jest.Mock).mockResolvedValue(false);
            await expect(
                service.login({
                    identifier: 'test@example.com',
                    password: 'wrong',
                })
            ).rejects.toThrow(HttpException);
        });

        it('returns tokens and user on success', async () => {
            const user = {
                id: '123',
                passwordHash: 'hashed',
                role: Role.MEMBER,
            };
            mockUserRepository.findByIdentifier.mockResolvedValue(user);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            mockJwtService.signAsync
                .mockResolvedValueOnce('access')
                .mockResolvedValueOnce('refresh');
            const result = await service.login({
                identifier: 'test@example.com',
                password: 'Password1!',
            });
            expect(result).toEqual({
                accessToken: 'access',
                refreshToken: 'refresh',
                user,
            });
        });
    });

    describe('signup', () => {
        it('throws when user already exists', async () => {
            mockUserRepository.existsByEmail.mockResolvedValue(true);
            await expect(
                service.signup({
                    email: 'existing@example.com',
                    password: 'Password1!',
                })
            ).rejects.toThrow(HttpException);
        });

        it('hashes password and creates a user with MEMBER role', async () => {
            const newUser = {
                id: '123',
                email: 'new@example.com',
                role: Role.MEMBER,
            };
            mockUserRepository.existsByEmail.mockResolvedValue(false);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed');
            mockUserRepository.create.mockResolvedValue(newUser);
            mockJwtService.signAsync
                .mockResolvedValueOnce('access')
                .mockResolvedValueOnce('refresh');
            const result = await service.signup({
                email: 'new@example.com',
                password: 'Password1!',
                firstName: 'John',
                lastName: 'Doe',
            });
            expect(result.accessToken).toBe('access');
            expect(mockUserRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    password: 'hashed',
                    firstName: 'John',
                })
            );
        });

        it('sets firstName and lastName to null when not provided', async () => {
            mockUserRepository.existsByEmail.mockResolvedValue(false);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed');
            mockUserRepository.create.mockResolvedValue({
                id: '123',
                role: Role.MEMBER,
            });
            mockJwtService.signAsync
                .mockResolvedValueOnce('access')
                .mockResolvedValueOnce('refresh');
            await service.signup({
                email: 'new@example.com',
                password: 'Password1!',
            });
            expect(mockUserRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ firstName: null, lastName: null })
            );
        });
    });

    describe('otp', () => {
        it('throws when resend is too soon', async () => {
            mockCache.exists.mockResolvedValue(true);
            await expect(
                service.sendOtp({ phone: '0912', purpose: 'login' })
            ).rejects.toThrow(HttpException);
        });

        it('stores hashed code and sends sms', async () => {
            mockCache.exists.mockResolvedValue(false);
            mockConfigService.get.mockReturnValue(undefined);
            await expect(
                service.sendOtp({ phone: '0912', purpose: 'login' })
            ).resolves.toEqual({ sent: true });
            expect(mockSms.send).toHaveBeenCalled();
            expect(mockCache.set).toHaveBeenCalled();
        });

        it('normalizes 10-digit iran mobiles before sms', async () => {
            mockCache.exists.mockResolvedValue(false);
            mockConfigService.get.mockReturnValue(undefined);
            await service.sendOtp({ phone: '9114174021', purpose: 'login' });
            expect(mockSms.send).toHaveBeenCalledWith(
                '09114174021',
                expect.stringMatching(/^کد تایید دانیکا: \d{6}$/)
            );
            expect(mockCache.set).toHaveBeenCalledWith(
                'otp:login:09114174021',
                expect.any(Object),
                expect.any(Number)
            );
        });

        it('throws when otp is missing', async () => {
            mockCache.get.mockResolvedValue(null);
            await expect(
                service.verifyOtp({
                    phone: '0912',
                    purpose: 'login',
                    code: '123456',
                })
            ).rejects.toThrow(HttpException);
        });

        it('locks after too many attempts', async () => {
            mockCache.get.mockResolvedValue({ hash: 'x', attempts: 5 });
            mockConfigService.get.mockReturnValue(undefined);
            await expect(
                service.verifyOtp({
                    phone: '0912',
                    purpose: 'login',
                    code: '123456',
                })
            ).rejects.toThrow(HttpException);
            expect(mockCache.del).toHaveBeenCalled();
        });

        it('increments attempts on invalid code', async () => {
            mockCache.get.mockResolvedValue({ hash: 'nope', attempts: 0 });
            await expect(
                service.verifyOtp({
                    phone: '0912',
                    purpose: 'login',
                    code: '000000',
                })
            ).rejects.toThrow(HttpException);
        });

        it('returns proof for reset purpose', async () => {
            mockCache.get.mockResolvedValue({
                hash: createHash('sha256').update('123456').digest('hex'),
                attempts: 0,
            });
            const result = await service.verifyOtp({
                phone: '0912',
                purpose: 'reset',
                code: '123456',
            });
            expect(result).toEqual(
                expect.objectContaining({ proof: expect.any(String) })
            );
        });

        it('issues tokens for login otp when user exists', async () => {
            mockCache.get.mockResolvedValue({
                hash: createHash('sha256').update('123456').digest('hex'),
                attempts: 0,
            });
            mockUserRepository.findByPhone.mockResolvedValue({
                id: 'u1',
                role: Role.MEMBER,
            });
            mockJwtService.signAsync
                .mockResolvedValueOnce('access')
                .mockResolvedValueOnce('refresh');
            const result = await service.verifyOtp({
                phone: '0912',
                purpose: 'login',
                code: '123456',
            });
            expect(result).toEqual(
                expect.objectContaining({ accessToken: 'access' })
            );
        });

        it('throws when login otp user is missing', async () => {
            mockCache.get.mockResolvedValue({
                hash: createHash('sha256').update('123456').digest('hex'),
                attempts: 0,
            });
            mockUserRepository.findByPhone.mockResolvedValue(null);
            await expect(
                service.verifyOtp({
                    phone: '0912',
                    purpose: 'login',
                    code: '123456',
                })
            ).rejects.toThrow(HttpException);
        });
    });

    describe('resetPassword', () => {
        it('throws when proof is invalid', async () => {
            mockCache.get.mockResolvedValue(null);
            await expect(
                service.resetPassword({
                    phone: '0912',
                    proof: 'x',
                    password: 'Password1!',
                })
            ).rejects.toThrow(HttpException);
        });

        it('throws when user is missing', async () => {
            mockCache.get.mockResolvedValue(
                createHash('sha256').update('proof').digest('hex')
            );
            mockUserRepository.findByPhone.mockResolvedValue(null);
            await expect(
                service.resetPassword({
                    phone: '0912',
                    proof: 'proof',
                    password: 'Password1!',
                })
            ).rejects.toThrow(HttpException);
        });

        it('updates password and revokes sessions', async () => {
            mockCache.get.mockResolvedValue(
                createHash('sha256').update('proof').digest('hex')
            );
            mockUserRepository.findByPhone.mockResolvedValue({ id: 'u1' });
            (argon2.hash as jest.Mock).mockResolvedValue('new-hash');
            await expect(
                service.resetPassword({
                    phone: '0912',
                    proof: 'proof',
                    password: 'Password1!',
                })
            ).resolves.toEqual({ success: true });
            expect(mockRefresh.revokeAllForUser).toHaveBeenCalledWith('u1');
        });
    });

    describe('refreshTokens', () => {
        it('throws without sessionId', async () => {
            await expect(
                service.refreshTokens({ userId: '1', role: Role.MEMBER })
            ).rejects.toThrow(HttpException);
        });

        it('throws when session is missing', async () => {
            mockRefresh.findById.mockResolvedValue(null);
            await expect(
                service.refreshTokens({
                    userId: '1',
                    role: Role.MEMBER,
                    sessionId: 's',
                })
            ).rejects.toThrow(HttpException);
        });

        it('throws when session is revoked or expired', async () => {
            mockRefresh.findById.mockResolvedValue({
                id: 's',
                revokedAt: new Date(),
                expiresAt: new Date(Date.now() + 10000),
            });
            await expect(
                service.refreshTokens({
                    userId: '1',
                    role: Role.MEMBER,
                    sessionId: 's',
                })
            ).rejects.toThrow(HttpException);
            mockRefresh.findById.mockResolvedValue({
                id: 's',
                revokedAt: null,
                expiresAt: new Date(0),
            });
            await expect(
                service.refreshTokens({
                    userId: '1',
                    role: Role.MEMBER,
                    sessionId: 's',
                })
            ).rejects.toThrow(HttpException);
        });

        it('throws when user is missing', async () => {
            mockRefresh.findById.mockResolvedValue({
                id: 's',
                revokedAt: null,
                expiresAt: new Date(Date.now() + 10000),
            });
            mockUserRepository.findById.mockResolvedValue(null);
            await expect(
                service.refreshTokens({
                    userId: '1',
                    role: Role.MEMBER,
                    sessionId: 's',
                })
            ).rejects.toThrow(HttpException);
        });

        it('rotates tokens', async () => {
            mockRefresh.findById.mockResolvedValue({
                id: 's',
                revokedAt: null,
                expiresAt: new Date(Date.now() + 10000),
            });
            mockUserRepository.findById.mockResolvedValue({
                id: '1',
                role: Role.MEMBER,
            });
            mockJwtService.signAsync
                .mockResolvedValueOnce('a')
                .mockResolvedValueOnce('r');
            await expect(
                service.refreshTokens({
                    userId: '1',
                    role: Role.MEMBER,
                    sessionId: 's',
                })
            ).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
        });
    });

    describe('logout', () => {
        it('revokes matching session', async () => {
            mockRefresh.findById.mockResolvedValue({
                id: 's',
                userId: 'u1',
                revokedAt: null,
            });
            await expect(service.logout('u1', 's')).resolves.toEqual({
                success: true,
            });
            expect(mockRefresh.revoke).toHaveBeenCalledWith('s');
        });

        it('skips revoke when session does not belong to user', async () => {
            mockRefresh.findById.mockResolvedValue({
                id: 's',
                userId: 'other',
                revokedAt: null,
            });
            await service.logout('u1', 's');
            expect(mockRefresh.revoke).not.toHaveBeenCalled();
        });

        it('revokes all when no session id', async () => {
            await service.logout('u1');
            expect(mockRefresh.revokeAllForUser).toHaveBeenCalledWith('u1');
        });
    });

    it('issues a school access token', async () => {
        mockJwtService.signAsync.mockResolvedValue('school');
        await expect(
            service.issueSchoolAccessToken({
                userId: 'u',
                role: Role.MEMBER,
                schoolId: 's',
                membershipId: 'm',
                permVersion: 1,
            })
        ).resolves.toBe('school');
        expect(mockJwtService.signAsync).toHaveBeenCalledWith(
            expect.objectContaining({ typ: 'school' }),
            expect.any(Object)
        );
    });
});
