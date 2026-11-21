import { Module } from '@nestjs/common';

import { CacheModule } from 'src/common/cache/cache.module';
import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolDashboardController } from './school-dashboard.controller';
import { SchoolDashboardService } from './school-dashboard.service';

@Module({
    imports: [DatabaseModule, CacheModule, SchoolAccessModule],
    controllers: [SchoolDashboardController],
    providers: [SchoolDashboardService],
})
export class SchoolDashboardModule {}
