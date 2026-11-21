import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { CacheModule } from 'src/common/cache/cache.module';
import { DatabaseModule } from 'src/common/database/database.module';

import { AuthPublicController } from './controllers/auth.public.controller';
import { SMS_PROVIDER } from './interfaces/sms-provider.interface';
import { ConsoleSmsProvider } from './providers/console-sms.provider';
import { JwtAccessStrategy } from './providers/jwt-access.strategy';
import { JwtRefreshStrategy } from './providers/jwt-refresh.strategy';
import { KavenegarSmsProvider } from './providers/kavenegar-sms.provider';
import { ParsGreenSmsProvider } from './providers/parsgreen-sms.provider';
import { AuthService } from './services/auth.service';

@Module({
    imports: [
        DatabaseModule,
        CacheModule,
        PassportModule,
        JwtModule.register({}),
        ConfigModule,
    ],
    controllers: [AuthPublicController],
    providers: [
        AuthService,
        JwtAccessStrategy,
        JwtRefreshStrategy,
        ConsoleSmsProvider,
        KavenegarSmsProvider,
        ParsGreenSmsProvider,
        {
            provide: SMS_PROVIDER,
            inject: [
                ConfigService,
                ConsoleSmsProvider,
                KavenegarSmsProvider,
                ParsGreenSmsProvider,
            ],
            useFactory: (
                config: ConfigService,
                consoleSms: ConsoleSmsProvider,
                kavenegar: KavenegarSmsProvider,
                parsGreen: ParsGreenSmsProvider
            ) => {
                const provider = config.get('auth.sms.provider');
                if (provider === 'parsgreen') {
                    return parsGreen;
                }
                if (provider === 'kavenegar') {
                    return kavenegar;
                }
                return consoleSms;
            },
        },
    ],
    exports: [AuthService, SMS_PROVIDER],
})
export class AuthModule {}
