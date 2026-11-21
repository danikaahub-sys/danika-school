import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
    accessToken: {
        secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
        tokenExp: process.env.AUTH_ACCESS_TOKEN_EXP,
    },
    refreshToken: {
        secret: process.env.AUTH_REFRESH_TOKEN_SECRET,
        tokenExp: process.env.AUTH_REFRESH_TOKEN_EXP,
    },
    sms: {
        provider: process.env.SMS_PROVIDER ?? 'console',
        kavenegarKey: process.env.KAVENEGAR_API_KEY,
        sender: process.env.KAVENEGAR_SENDER,
        timeoutMs: Number(process.env.SMS_TIMEOUT_MS ?? 10_000),
        parsGreen: {
            signature: process.env.PARSGREEN_SIGNATURE,
            from: process.env.PARSGREEN_FROM,
        },
    },
    otp: {
        ttlSeconds: Number(process.env.AUTH_OTP_TTL ?? 120),
        resendSeconds: Number(process.env.AUTH_OTP_RESEND ?? 60),
        maxAttempts: Number(process.env.AUTH_OTP_MAX_ATTEMPTS ?? 5),
    },
}));
