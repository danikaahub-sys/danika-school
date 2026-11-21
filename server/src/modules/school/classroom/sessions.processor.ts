import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { DatabaseService } from 'src/common/database/services/database.service';

import { SchoolClassroomService } from './school-classroom.service';

@Processor('sessions')
export class SessionsProcessor extends WorkerHost {
    constructor(
        private readonly db: DatabaseService,
        private readonly classroom: SchoolClassroomService
    ) {
        super();
    }

    async process(job: Job<{ schoolId?: string; date?: string }>) {
        if (job.data.schoolId) {
            return this.classroom.generateForSchool(
                job.data.schoolId,
                job.data.date ? new Date(job.data.date) : new Date()
            );
        }
        const schools = await this.db.school.findMany({ select: { id: true } });
        let created = 0;
        for (const school of schools) {
            const result = await this.classroom.generateForSchool(
                school.id,
                job.data.date ? new Date(job.data.date) : new Date()
            );
            created += result.created;
        }
        return { created };
    }
}
