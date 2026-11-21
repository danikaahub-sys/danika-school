import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { Job } from 'bullmq';

import { DatabaseService } from 'src/common/database/services/database.service';
import {
    SMS_PROVIDER,
    type SmsProvider,
} from 'src/modules/auth/interfaces/sms-provider.interface';

@Processor('sms')
export class SmsProcessor extends WorkerHost {
    constructor(
        private readonly db: DatabaseService,
        @Inject(SMS_PROVIDER) private readonly sms: SmsProvider
    ) {
        super();
    }

    async process(
        job: Job<{
            deliveryId: string;
            schoolId: string;
            phone: string | null;
            body: string;
        }>
    ) {
        if (!job.data.phone) {
            await this.db.messageDelivery.update({
                where: { id: job.data.deliveryId },
                data: {
                    status: DeliveryStatus.FAILED,
                    error: 'missing phone',
                },
            });
            return;
        }
        try {
            await this.sms.send(job.data.phone, job.data.body);
            await this.db.messageDelivery.update({
                where: { id: job.data.deliveryId },
                data: { status: DeliveryStatus.SENT, sentAt: new Date() },
            });
        } catch (error) {
            await this.db.messageDelivery.update({
                where: { id: job.data.deliveryId },
                data: {
                    status: DeliveryStatus.FAILED,
                    error:
                        error instanceof Error ? error.message : 'sms failed',
                },
            });
        }
    }
}
