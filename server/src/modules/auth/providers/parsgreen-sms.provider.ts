import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { SmsProvider } from '../interfaces/sms-provider.interface';

const SEND_SMS_URL = 'https://sms.parsgreen.ir/Apiv2/Message/SendSms';
const DEFAULT_TIMEOUT_MS = 10_000;

interface ParsGreenSendSmsResponse {
    R_Success?: boolean;
    R_Message?: string;
    R_Error?: string | null;
    SuccessCount?: number;
}

@Injectable()
export class ParsGreenSmsProvider implements SmsProvider {
    private readonly logger = new Logger(ParsGreenSmsProvider.name);

    constructor(private readonly configService: ConfigService) {}

    async send(phone: string, message: string): Promise<void> {
        const signature = this.configService.get<string>(
            'auth.sms.parsGreen.signature'
        );
        if (!signature) {
            this.logger.warn('ParsGreen API key missing; SMS not sent');
            return;
        }

        const from =
            this.configService.get<string>('auth.sms.parsGreen.from') ?? '';
        const timeoutMs =
            this.configService.get<number>('auth.sms.timeoutMs') ??
            DEFAULT_TIMEOUT_MS;
        const mobile = toParsGreenMobile(phone);

        const response = await fetch(SEND_SMS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `basic apikey:${signature}`,
            },
            body: JSON.stringify({
                SmsBody: message,
                Mobiles: [mobile],
                SmsNumber: from,
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });

        const raw = await response.text();
        if (!response.ok) {
            this.logger.error(`ParsGreen failed: ${response.status} ${raw}`);
            throw new Error('sms.sendFailed');
        }

        let parsed: ParsGreenSendSmsResponse;
        try {
            parsed = JSON.parse(raw) as ParsGreenSendSmsResponse;
        } catch {
            this.logger.error(
                `ParsGreen unreadable reply: ${raw.slice(0, 120)}`
            );
            throw new Error('sms.sendFailed');
        }

        if (!parsed.R_Success || !(parsed.SuccessCount ?? 0)) {
            this.logger.error(
                `ParsGreen refused: ${parsed.R_Error ?? parsed.R_Message ?? raw.slice(0, 120)}`
            );
            throw new Error('sms.sendFailed');
        }
    }
}

/** ParsGreen SendSms expects `09xxxxxxxxx`. */
function toParsGreenMobile(phone: string): string {
    if (/^\+989\d{9}$/.test(phone)) {
        return `0${phone.slice(3)}`;
    }
    return phone.replace(/^\+/, '');
}
