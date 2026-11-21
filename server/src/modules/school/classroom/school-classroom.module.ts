import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolClassroomController } from './school-classroom.controller';
import { SchoolClassroomService } from './school-classroom.service';
import { SessionsProcessor } from './sessions.processor';

@Module({
    imports: [
        DatabaseModule,
        SchoolAccessModule,
        BullModule.registerQueue({ name: 'sessions' }),
    ],
    controllers: [SchoolClassroomController],
    providers: [SchoolClassroomService, SessionsProcessor],
    exports: [SchoolClassroomService],
})
export class SchoolClassroomModule {}
