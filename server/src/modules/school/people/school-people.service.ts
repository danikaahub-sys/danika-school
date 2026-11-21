import { InjectQueue } from '@nestjs/bullmq';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PersonKind, PersonStatus } from '@prisma/client';
import { Queue } from 'bullmq';

import { DatabaseService } from 'src/common/database/services/database.service';
import {
    paginate,
    PaginationQueryDto,
    skipTake,
} from 'src/common/pagination/pagination.dto';

import type { SchoolContext } from '../access/school-context';
import { ScopeService } from '../access/scope.service';

@Injectable()
export class SchoolPeopleService {
    constructor(
        private readonly db: DatabaseService,
        private readonly scope: ScopeService,
        @InjectQueue('import') private readonly importQueue: Queue
    ) {}

    async list(
        ctx: SchoolContext,
        kind: PersonKind | undefined,
        query: PaginationQueryDto & { search?: string; classId?: string }
    ) {
        const scoped = await this.scope.studentIds(ctx);
        const where = {
            schoolId: ctx.schoolId,
            ...(kind ? { kind } : {}),
            deletedAt: null,
            ...(scoped ? { id: { in: scoped } } : {}),
            ...(query.classId
                ? {
                      enrollments: {
                          some: {
                              classId: query.classId,
                              yearId: ctx.yearId,
                          },
                      },
                  }
                : {}),
            ...(query.search
                ? {
                      OR: [
                          {
                              firstName: {
                                  contains: query.search,
                                  mode: 'insensitive' as const,
                              },
                          },
                          {
                              lastName: {
                                  contains: query.search,
                                  mode: 'insensitive' as const,
                              },
                          },
                          { nationalId: { contains: query.search } },
                          { phone: { contains: query.search } },
                      ],
                  }
                : {}),
        };
        const { skip, take } = skipTake(query);
        const [items, total] = await this.db.$transaction([
            this.db.person.findMany({
                where,
                skip,
                take,
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
                include: {
                    enrollments: {
                        where: { yearId: ctx.yearId },
                        take: 1,
                        include: { class: { include: { grade: true } } },
                    },
                },
            }),
            this.db.person.count({ where }),
        ]);
        return paginate(items, total, query);
    }

    async detail(ctx: SchoolContext, id: string) {
        const person = await this.db.person.findFirst({
            where: { id, schoolId: ctx.schoolId, deletedAt: null },
            include: {
                enrollments: {
                    where: { yearId: ctx.yearId },
                    include: { class: { include: { grade: true } } },
                },
                guardianAsGuardian: { include: { student: true } },
                guardianAsStudent: { include: { guardian: true } },
                attendance: { take: 50, orderBy: { updatedAt: 'desc' } },
                marks: {
                    take: 50,
                    include: { assessment: true },
                },
                charges: { where: { yearId: ctx.yearId } },
            },
        });
        if (!person) {
            throw new HttpException(
                'school.error.personNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        const enrollment = person.enrollments[0];
        const className = enrollment
            ? `${enrollment.class.grade?.name ?? ''} ${enrollment.class.name}`.trim()
            : '';
        return {
            person,
            name: `${person.firstName} ${person.lastName}`.trim(),
            className,
            links: [
                ...person.guardianAsGuardian,
                ...person.guardianAsStudent,
            ].map(link => ({
                ...link,
                verified: Boolean(link.verifiedAt),
            })),
            attendance: person.attendance,
            scores: person.marks.map(mark => ({
                ...mark,
                title: mark.assessment.title,
                maximum: Number(mark.assessment.maximum),
                weight: Number(mark.assessment.weight),
                earned: mark.earned == null ? null : Number(mark.earned),
            })),
            charges: person.charges,
        };
    }

    async create(
        ctx: SchoolContext,
        data: {
            kind: PersonKind;
            firstName: string;
            lastName: string;
            nationalId?: string;
            phone?: string;
            classId?: string;
        }
    ) {
        return this.db.$transaction(async tx => {
            const person = await tx.person.create({
                data: {
                    schoolId: ctx.schoolId,
                    kind: data.kind,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    nationalId: data.nationalId,
                    phone: data.phone,
                    status: PersonStatus.ACTIVE,
                },
            });
            if (data.classId && data.kind === PersonKind.STUDENT) {
                await tx.enrollment.create({
                    data: {
                        schoolId: ctx.schoolId,
                        yearId: ctx.yearId,
                        classId: data.classId,
                        studentId: person.id,
                    },
                });
            }
            return person;
        });
    }

    async update(
        ctx: SchoolContext,
        id: string,
        data: {
            firstName?: string;
            lastName?: string;
            nationalId?: string;
            phone?: string;
            classId?: string;
        }
    ) {
        await this.detail(ctx, id);
        const person = await this.db.person.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                nationalId: data.nationalId,
                phone: data.phone,
            },
        });
        if (data.classId) {
            await this.db.enrollment.upsert({
                where: {
                    schoolId_yearId_studentId: {
                        schoolId: ctx.schoolId,
                        yearId: ctx.yearId,
                        studentId: id,
                    },
                },
                update: { classId: data.classId },
                create: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    classId: data.classId,
                    studentId: id,
                },
            });
        }
        return person;
    }

    async archive(ctx: SchoolContext, id: string) {
        await this.detail(ctx, id);
        return this.db.person.update({
            where: { id },
            data: { deletedAt: new Date(), status: PersonStatus.DEACTIVATED },
        });
    }

    async createLink(
        ctx: SchoolContext,
        data: {
            guardianId: string;
            studentId: string;
            relation: string;
        }
    ) {
        return this.db.guardianLink.create({
            data: {
                schoolId: ctx.schoolId,
                guardianId: data.guardianId,
                studentId: data.studentId,
                relation: data.relation,
            },
        });
    }

    async verifyLink(ctx: SchoolContext, id: string) {
        const link = await this.db.guardianLink.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
        if (!link) {
            throw new HttpException(
                'school.error.linkNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return this.db.guardianLink.update({
            where: { id },
            data: { verifiedAt: new Date() },
        });
    }

    async setLinkVisibility(
        ctx: SchoolContext,
        id: string,
        data: { academicVisible?: boolean; financialVisible?: boolean }
    ) {
        const link = await this.db.guardianLink.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
        if (!link) {
            throw new HttpException(
                'school.error.linkNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return this.db.guardianLink.update({ where: { id }, data });
    }

    async enqueueImport(ctx: SchoolContext, csv: string) {
        const job = await this.db.importJob.create({
            data: {
                schoolId: ctx.schoolId,
                kind: 'PEOPLE',
                status: 'PENDING',
            },
        });
        await this.importQueue.add('people', {
            jobId: job.id,
            schoolId: ctx.schoolId,
            yearId: ctx.yearId,
            csv,
        });
        return job;
    }

    getImport(ctx: SchoolContext, id: string) {
        return this.db.importJob.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
    }
}
