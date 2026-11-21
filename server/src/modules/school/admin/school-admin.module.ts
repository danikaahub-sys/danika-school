import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolSessionModule } from '../session/school-session.module';
import { SchoolAdminController } from './school-admin.controller';
import { SchoolAdminService } from './school-admin.service';

@Module({
    imports: [DatabaseModule, SchoolAccessModule, SchoolSessionModule],
    controllers: [SchoolAdminController],
    providers: [SchoolAdminService],
})
export class SchoolAdminModule {}
