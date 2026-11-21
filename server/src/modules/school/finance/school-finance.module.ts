import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolFinanceController } from './school-finance.controller';
import { SchoolFinanceService } from './school-finance.service';

@Module({
    imports: [DatabaseModule, SchoolAccessModule],
    controllers: [SchoolFinanceController],
    providers: [SchoolFinanceService],
})
export class SchoolFinanceModule {}
