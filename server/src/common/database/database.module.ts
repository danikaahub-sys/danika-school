import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RefreshSessionRepository } from './repositories/refresh-session.repository';
import { UserRepository } from './repositories/user.repository';
import { DatabaseService } from './services/database.service';

@Module({
    imports: [ConfigModule],
    providers: [DatabaseService, UserRepository, RefreshSessionRepository],
    exports: [DatabaseService, UserRepository, RefreshSessionRepository],
})
export class DatabaseModule {}
