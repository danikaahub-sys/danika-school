import { InjectQueue } from '@nestjs/bullmq';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
    BaseRole,
    DeliveryStatus,
    MessageChannel,
    PersonKind,
} from '@prisma/client';
import { Queue } from 'bullmq';

import { DatabaseService } from 'src/common/database/services/database.service';
import {
    paginate,
    PaginationQueryDto,
    skipTake,
} from 'src/common/pagination/pagination.dto';

import type { SchoolContext } from '../access/school-context';

export type Audience = {
    all?: boolean;
    gradeIds?: string[];
    classIds?: string[];
    roles?: Array<'STUDENT' | 'STAFF' | 'GUARDIAN' | BaseRole>;
};

@Injectable()
export class SchoolCommsService {
    constructor(
        private readonly db: DatabaseService,
        @InjectQueue('sms') private readonly smsQueue: Queue
    ) {}

    announcements(ctx: SchoolContext) {
        return this.db.announcement.findMany({
            where: { schoolId: ctx.schoolId },
            orderBy: { createdAt: 'desc' },
        });
    }

    templates(ctx: SchoolContext) {
        return this.db.messageTemplate.findMany({
            where: { schoolId: ctx.schoolId },
            orderBy: { createdAt: 'desc' },
        });
    }

    createTemplate(
        ctx: SchoolContext,
        data: { title: string; body: string; channel: MessageChannel }
    ) {
        return this.db.messageTemplate.create({
            data: {
                schoolId: ctx.schoolId,
                title: data.title,
                body: data.body,
                channel: data.channel,
            },
        });
    }

    async updateTemplate(
        ctx: SchoolContext,
        id: string,
        data: { title?: string; body?: string; channel?: MessageChannel }
    ) {
        const template = await this.db.messageTemplate.findFirst({
            where: { id, schoolId: ctx.schoolId },
        });
        if (!template) {
            throw new HttpException(
                'school.error.templateNotFound',
                HttpStatus.NOT_FOUND
            );
        }
        return this.db.messageTemplate.update({ where: { id }, data });
    }

    async sendAnnouncement(
        ctx: SchoolContext,
        data: {
            title: string;
            body: string;
            channel: MessageChannel;
            audience: Audience;
        }
    ) {
        const personIds = await this.resolveAudience(ctx, data.audience);
        const announcement = await this.db.announcement.create({
            data: {
                schoolId: ctx.schoolId,
                title: data.title,
                body: data.body,
                channel: data.channel,
                audience: data.audience,
                sentAt: new Date(),
            },
        });
        if (personIds.length === 0) {
            return { announcement, queued: 0 };
        }
        await this.db.messageDelivery.createMany({
            data: personIds.map(personId => ({
                schoolId: ctx.schoolId,
                announcementId: announcement.id,
                personId,
                channel: data.channel,
                status: DeliveryStatus.PENDING,
            })),
        });
        const deliveries = await this.db.messageDelivery.findMany({
            where: { announcementId: announcement.id, schoolId: ctx.schoolId },
            include: { person: true },
        });
        const smsJobs = deliveries.filter(
            item =>
                data.channel !== MessageChannel.APP &&
                Boolean(item.person.phone)
        );
        await Promise.all(
            smsJobs.map(item =>
                this.smsQueue.add('send', {
                    deliveryId: item.id,
                    schoolId: ctx.schoolId,
                    phone: item.person.phone,
                    body: data.body,
                })
            )
        );
        if (data.channel === MessageChannel.APP) {
            await this.db.messageDelivery.updateMany({
                where: {
                    announcementId: announcement.id,
                    schoolId: ctx.schoolId,
                },
                data: { status: DeliveryStatus.SENT, sentAt: new Date() },
            });
        }
        return { announcement, queued: smsJobs.length };
    }

    async deliveries(ctx: SchoolContext, query: PaginationQueryDto) {
        const where = { schoolId: ctx.schoolId };
        const { skip, take } = skipTake(query);
        const [items, total] = await this.db.$transaction([
            this.db.messageDelivery.findMany({
                where,
                skip,
                take,
                include: { person: true, announcement: true },
                orderBy: { sentAt: 'desc' },
            }),
            this.db.messageDelivery.count({ where }),
        ]);
        return paginate(items, total, query);
    }

    async resolveAudience(
        ctx: SchoolContext,
        audience: Audience
    ): Promise<string[]> {
        if (audience.all) {
            const people = await this.db.person.findMany({
                where: { schoolId: ctx.schoolId, deletedAt: null },
                select: { id: true },
            });
            return people.map(item => item.id);
        }
        const ids = new Set<string>();
        if (audience.classIds?.length) {
            const enrollments = await this.db.enrollment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    classId: { in: audience.classIds },
                },
                select: { studentId: true },
            });
            enrollments.forEach(item => ids.add(item.studentId));
        }
        if (audience.gradeIds?.length) {
            const enrollments = await this.db.enrollment.findMany({
                where: {
                    schoolId: ctx.schoolId,
                    yearId: ctx.yearId,
                    class: { gradeId: { in: audience.gradeIds } },
                },
                select: { studentId: true },
            });
            enrollments.forEach(item => ids.add(item.studentId));
        }
        if (audience.roles?.length) {
            const kinds = audience.roles.filter((role): role is PersonKind =>
                ['STUDENT', 'STAFF', 'GUARDIAN'].includes(role)
            );
            if (kinds.length) {
                const people = await this.db.person.findMany({
                    where: {
                        schoolId: ctx.schoolId,
                        kind: { in: kinds },
                        deletedAt: null,
                    },
                    select: { id: true },
                });
                people.forEach(item => ids.add(item.id));
            }
            const baseRoles = audience.roles.filter((role): role is BaseRole =>
                Object.values(BaseRole).includes(role)
            );
            if (baseRoles.length) {
                const memberships = await this.db.schoolMembership.findMany({
                    where: {
                        schoolId: ctx.schoolId,
                        position: { baseRole: { in: baseRoles } },
                    },
                    select: { personId: true },
                });
                memberships.forEach(item => ids.add(item.personId));
            }
        }
        return [...ids];
    }
}
