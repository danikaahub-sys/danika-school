import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PersonKind } from '@prisma/client';
import { Job } from 'bullmq';

import { DatabaseService } from 'src/common/database/services/database.service';

@Processor('import')
export class PeopleImportProcessor extends WorkerHost {
    constructor(private readonly db: DatabaseService) {
        super();
    }

    async process(
        job: Job<{
            jobId: string;
            schoolId: string;
            yearId: string;
            csv: string;
        }>
    ): Promise<void> {
        const { jobId, schoolId, yearId, csv } = job.data;
        await this.db.importJob.update({
            where: { id: jobId },
            data: { status: 'RUNNING' },
        });
        const rows = parseCsv(csv);
        const errors: Array<{ row: number; message: string }> = [];
        let created = 0;
        for (const [index, row] of rows.entries()) {
            try {
                if (!row.firstName || !row.lastName) {
                    throw new Error('missing name');
                }
                await this.db.person.create({
                    data: {
                        schoolId,
                        kind: PersonKind.STUDENT,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        nationalId: row.nationalId || null,
                        phone: row.phone || null,
                    },
                });
                created += 1;
            } catch (error) {
                errors.push({
                    row: index + 1,
                    message:
                        error instanceof Error ? error.message : 'invalid row',
                });
            }
        }
        await this.db.importJob.update({
            where: { id: jobId },
            data: {
                status: errors.length && created === 0 ? 'FAILED' : 'DONE',
                totals: { created, failed: errors.length, yearId },
                errors,
            },
        });
    }
}

function parseCsv(csv: string): Array<Record<string, string>> {
    const lines = csv
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(item => item.trim());
    return lines.slice(1).map(line => {
        const cols = line.split(',').map(item => item.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = cols[index] ?? '';
        });
        return row;
    });
}
