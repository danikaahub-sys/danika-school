import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolSetupController } from './school-setup.controller';
import { SchoolSetupService } from './school-setup.service';

@Module({
    imports: [DatabaseModule, SchoolAccessModule],
    controllers: [SchoolSetupController],
    providers: [SchoolSetupService],
    exports: [SchoolSetupService],
})
export class SchoolSetupModule {}
