import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { MidNightScheduleWorker } from './schedulers/midnight.scheduler';
import { SessionsScheduleWorker } from './schedulers/sessions.scheduler';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        BullModule.registerQueue({ name: 'sessions' }),
    ],
    providers: [MidNightScheduleWorker, SessionsScheduleWorker],
})
export class WorkerModule {}
