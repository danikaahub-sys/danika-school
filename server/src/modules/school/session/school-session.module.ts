import { Module } from '@nestjs/common';

import { DatabaseModule } from 'src/common/database/database.module';
import { AuthModule } from 'src/modules/auth/auth.module';

import { SchoolAccessModule } from '../access/school-access.module';
import { SchoolSessionController } from './school-session.controller';
import { SchoolSessionService } from './school-session.service';

@Module({
    imports: [DatabaseModule, AuthModule, SchoolAccessModule],
    controllers: [SchoolSessionController],
    providers: [SchoolSessionService],
    exports: [SchoolSessionService],
})
export class SchoolSessionModule {}
