import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { SmsProvider } from '../interfaces/sms-provider.interface';

@Injectable()
export class KavenegarSmsProvider implements SmsProvider {
    private readonly logger = new Logger(KavenegarSmsProvider.name);

    constructor(private readonly configService: ConfigService) {}

    async send(phone: string, message: string): Promise<void> {
        const apiKey = this.configService.get<string>('auth.sms.kavenegarKey');
        const sender = this.configService.get<string>('auth.sms.sender');
        if (!apiKey) {
            this.logger.warn('Kavenegar API key missing; SMS not sent');
            return;
        }
        const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
        const body = new URLSearchParams({
            receptor: phone,
            message,
            ...(sender ? { sender } : {}),
        });
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!response.ok) {
            const text = await response.text();
            this.logger.error(`Kavenegar failed: ${response.status} ${text}`);
            throw new Error('sms.sendFailed');
        }
    }
}
