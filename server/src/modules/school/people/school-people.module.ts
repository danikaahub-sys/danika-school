import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { PeopleImportProcessor } from './people-import.processor';
import { SchoolPeopleController } from './school-people.controller';
import { SchoolPeopleService } from './school-people.service';

@Module({
    imports: [
        DatabaseModule,
        SchoolAccessModule,
        BullModule.registerQueue({ name: 'import' }),
    ],
    controllers: [SchoolPeopleController],
    providers: [SchoolPeopleService, PeopleImportProcessor],
})
export class SchoolPeopleModule {}
