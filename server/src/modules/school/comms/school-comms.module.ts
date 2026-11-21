import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';
import { AuthModule } from 'src/modules/auth/auth.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolCommsController } from './school-comms.controller';
import { SchoolCommsService } from './school-comms.service';
import { SmsProcessor } from './sms.processor';

@Module({
    imports: [
        DatabaseModule,
        SchoolAccessModule,
        AuthModule,
        BullModule.registerQueue({ name: 'sms' }),
    ],
    controllers: [SchoolCommsController],
    providers: [SchoolCommsService, SmsProcessor],
})
export class SchoolCommsModule {}
