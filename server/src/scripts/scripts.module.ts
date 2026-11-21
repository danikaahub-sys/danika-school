import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandModule } from 'nestjs-command';

import configs from 'src/common/config';
import { DatabaseModule } from 'src/common/database/database.module';

import { SchoolSeed } from './seeds/school.seed';
import { UserSeed } from './seeds/user.seed';

@Module({
    imports: [
        ConfigModule.forRoot({
            load: configs,
            isGlobal: true,
            cache: true,
            envFilePath: ['.env'],
        }),
        DatabaseModule,
        CommandModule,
    ],
    providers: [UserSeed, SchoolSeed],
})
export class ScriptsModule {}
