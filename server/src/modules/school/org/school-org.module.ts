import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolOrgController } from './school-org.controller';
import { SchoolOrgService } from './school-org.service';

@Module({
    imports: [DatabaseModule, SchoolAccessModule],
    controllers: [SchoolOrgController],
    providers: [SchoolOrgService],
})
export class SchoolOrgModule {}
