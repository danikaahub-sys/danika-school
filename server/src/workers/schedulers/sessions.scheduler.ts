import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class SessionsScheduleWorker {
    private readonly logger = new Logger(SessionsScheduleWorker.name);

    constructor(@InjectQueue('sessions') private readonly sessions: Queue) {}

    @Cron('10 5 * * *', { timeZone: 'Asia/Tehran' })
    async handleCron() {
        this.logger.log('Enqueue daily teaching sessions');
        await this.sessions.add('generate-all', {});
    }
}
