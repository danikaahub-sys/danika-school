import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { SchoolAccessModule } from './access/school-access.module';
import { SchoolAdminModule } from './admin/school-admin.module';
import { SchoolClassroomModule } from './classroom/school-classroom.module';
import { SchoolCommsModule } from './comms/school-comms.module';
import { SchoolDashboardModule } from './dashboard/school-dashboard.module';
import { SchoolFinanceModule } from './finance/school-finance.module';
import { SchoolOrgModule } from './org/school-org.module';
import { SchoolPeopleModule } from './people/school-people.module';
import { SchoolSessionModule } from './session/school-session.module';
import { SchoolSetupModule } from './setup/school-setup.module';

@Module({
    imports: [
        SchoolAccessModule,
        SchoolSessionModule,
        SchoolOrgModule,
        SchoolSetupModule,
        SchoolPeopleModule,
        SchoolAdminModule,
        SchoolClassroomModule,
        SchoolFinanceModule,
        SchoolCommsModule,
        SchoolDashboardModule,
        RouterModule.register([
            {
                path: 'school',
                children: [
                    { path: '/', module: SchoolSessionModule },
                    { path: 'orgs', module: SchoolOrgModule },
                    { path: '/', module: SchoolDashboardModule },
                    { path: 'setup', module: SchoolSetupModule },
                    { path: 'people', module: SchoolPeopleModule },
                    { path: 'admin', module: SchoolAdminModule },
                    { path: 'classroom', module: SchoolClassroomModule },
                    { path: 'finance', module: SchoolFinanceModule },
                    {
                        path: 'communications',
                        module: SchoolCommsModule,
                    },
                ],
            },
        ]),
    ],
})
export class SchoolModule {}
