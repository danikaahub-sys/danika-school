import { createHash } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
    BaseRole,
    MembershipStatus,
    MoneyUnit,
    OrgMemberRole,
    PersonKind,
    PersonStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { Command } from 'nestjs-command';

import { UserRole } from 'src/common/database/enums/role.enum';
import { DatabaseService } from 'src/common/database/services/database.service';
import {
    permissionsForRole,
    prismaRoleToCatalog,
} from 'src/modules/school/access/permission.catalog';

const DEMO_PASSWORD = 'Password1!';
const FIRST_NAMES = [
    'علی',
    'محمد',
    'امیر',
    'رضا',
    'حسین',
    'پارسا',
    'آراد',
    'کیان',
    'سینا',
    'نیما',
    'یاسین',
    'عرفان',
];
const LAST_NAMES = [
    'محمدی',
    'حسینی',
    'رضایی',
    'کریمی',
    'نوری',
    'جعفری',
    'کاظمی',
    'موسوی',
    'احمدی',
    'نیکنام',
    'شریفی',
    'صادقی',
];

@Injectable()
export class SchoolSeed {
    private readonly logger = new Logger(SchoolSeed.name);

    constructor(private readonly db: DatabaseService) {}

    @Command({
        command: 'seed:school-demo',
        describe:
            'Seed a demo organization, school, year 1405-1406 and ~90 students.',
    })
    async seed(): Promise<void> {
        const existing = await this.db.school.findFirst({
            where: { name: 'دبیرستان دانیکا' },
        });
        if (existing) {
            this.logger.log('Demo school already exists');
            return;
        }
        const password = await argon2.hash(DEMO_PASSWORD);
        const org = await this.db.organization.create({
            data: { name: 'سازمان دانیکا' },
        });
        const school = await this.db.school.create({
            data: {
                organizationId: org.id,
                name: 'دبیرستان دانیکا',
                city: 'تهران',
                moneyUnit: MoneyUnit.TOMAN,
                settings: { create: { locale: 'fa', smsSender: 'Danika' } },
            },
        });
        await this.db.academicYear.createMany({
            data: [
                {
                    schoolId: school.id,
                    label: '۱۴۰۴–۱۴۰۵',
                    startsOn: new Date('2025-09-23'),
                    endsOn: new Date('2026-06-21'),
                    isActive: false,
                },
                {
                    schoolId: school.id,
                    label: '۱۴۰۵–۱۴۰۶',
                    startsOn: new Date('2026-09-23'),
                    endsOn: new Date('2027-06-21'),
                    isActive: true,
                },
            ],
        });
        const year = await this.db.academicYear.findFirstOrThrow({
            where: { schoolId: school.id, isActive: true },
        });
        const grades = await Promise.all(
            ['هفتم', 'هشتم', 'نهم'].map(name =>
                this.db.grade.create({ data: { schoolId: school.id, name } })
            )
        );
        const classDefs = [
            { name: 'هفتم الف', grade: grades[0] },
            { name: 'هفتم ب', grade: grades[0] },
            { name: 'هشتم الف', grade: grades[1] },
            { name: 'نهم الف', grade: grades[2] },
        ];
        const classes = await Promise.all(
            classDefs.map(item =>
                this.db.schoolClass.create({
                    data: {
                        schoolId: school.id,
                        yearId: year.id,
                        gradeId: item.grade.id,
                        name: item.name,
                    },
                })
            )
        );
        const subjects = await Promise.all(
            ['ریاضی', 'فارسی', 'علوم', 'انگلیسی'].map(name =>
                this.db.subject.create({
                    data: { schoolId: school.id, name },
                })
            )
        );
        const periods = await Promise.all(
            [
                { name: 'زنگ ۱', start: '07:45', end: '08:30', sortOrder: 1 },
                { name: 'زنگ ۲', start: '08:40', end: '09:25', sortOrder: 2 },
                { name: 'زنگ ۳', start: '09:35', end: '10:20', sortOrder: 3 },
                { name: 'زنگ ۴', start: '10:40', end: '11:25', sortOrder: 4 },
            ].map(item =>
                this.db.bellPeriod.create({
                    data: {
                        schoolId: school.id,
                        name: item.name,
                        startTime: item.start,
                        endTime: item.end,
                        sortOrder: item.sortOrder,
                    },
                })
            )
        );
        const positionDefs: Array<{
            name: string;
            baseRole: BaseRole;
            isAll?: boolean;
        }> = [
            { name: 'مدیر مدرسه', baseRole: BaseRole.PRINCIPAL, isAll: true },
            { name: 'معاون', baseRole: BaseRole.DEPUTY },
            { name: 'معلم', baseRole: BaseRole.TEACHER },
            { name: 'حسابدار', baseRole: BaseRole.FINANCE },
            { name: 'دانش‌آموز', baseRole: BaseRole.STUDENT },
            { name: 'ولی', baseRole: BaseRole.GUARDIAN },
        ];
        const positions = await Promise.all(
            positionDefs.map(item =>
                this.db.position.create({
                    data: {
                        schoolId: school.id,
                        name: item.name,
                        baseRole: item.baseRole,
                        isAll: item.isAll ?? false,
                        permissions: item.isAll
                            ? []
                            : permissionsForRole(
                                  prismaRoleToCatalog(item.baseRole)
                              ),
                    },
                })
            )
        );
        const positionByRole = Object.fromEntries(
            positions.map(item => [item.baseRole, item])
        ) as Record<BaseRole, (typeof positions)[number]>;

        const staff = [
            {
                firstName: 'محمد',
                lastName: 'وحیدیان',
                phone: '09120000000',
                userName: 'principal',
                role: BaseRole.PRINCIPAL,
            },
            {
                firstName: 'سارا',
                lastName: 'احمدی',
                phone: '09121111111',
                userName: 'deputy',
                role: BaseRole.DEPUTY,
            },
            {
                firstName: 'رضا',
                lastName: 'نوری',
                phone: '09122222222',
                userName: 'teacher',
                role: BaseRole.TEACHER,
            },
            {
                firstName: 'مینا',
                lastName: 'کاظمی',
                phone: '09123333333',
                userName: 'teacher2',
                role: BaseRole.TEACHER,
            },
            {
                firstName: 'لیلا',
                lastName: 'جعفری',
                phone: '09124444444',
                userName: 'finance',
                role: BaseRole.FINANCE,
            },
        ];
        const staffPeople: string[] = [];
        for (const item of staff) {
            const personId = await this.createMember(school.id, password, {
                kind: PersonKind.STAFF,
                firstName: item.firstName,
                lastName: item.lastName,
                phone: item.phone,
                userName: item.userName,
                positionId: positionByRole[item.role].id,
            });
            staffPeople.push(personId);
        }
        const owner = await this.db.user.findFirstOrThrow({
            where: { userName: 'principal' },
        });
        await this.db.organizationMember.create({
            data: {
                organizationId: org.id,
                userId: owner.id,
                role: OrgMemberRole.OWNER,
            },
        });

        const teacherA = staffPeople[2];
        const teacherB = staffPeople[3];
        const assignments = [];
        for (const schoolClass of classes) {
            for (const [index, subject] of subjects.entries()) {
                assignments.push(
                    await this.db.teachingAssignment.create({
                        data: {
                            schoolId: school.id,
                            yearId: year.id,
                            classId: schoolClass.id,
                            subjectId: subject.id,
                            teacherPersonId:
                                index % 2 === 0 ? teacherA : teacherB,
                        },
                    })
                );
            }
        }
        for (const schoolClass of classes) {
            for (const [index, period] of periods.entries()) {
                const assignment = assignments.find(
                    item =>
                        item.classId === schoolClass.id &&
                        item.subjectId === subjects[index % subjects.length].id
                );
                if (!assignment) continue;
                await this.db.timetableSlot.create({
                    data: {
                        schoolId: school.id,
                        classId: schoolClass.id,
                        day: (index % 5) + 1,
                        periodId: period.id,
                        assignmentId: assignment.id,
                    },
                });
            }
        }

        const studentIds: string[] = [];
        const STUDENTS_PER_CLASS = 23;
        for (const [classIndex, schoolClass] of classes.entries()) {
            for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
                const n = classIndex * STUDENTS_PER_CLASS + i;
                const firstName = FIRST_NAMES[n % FIRST_NAMES.length];
                const lastName = LAST_NAMES[n % LAST_NAMES.length];
                const phone = n === 0 ? '09125555555' : null;
                const person = await this.db.person.create({
                    data: {
                        schoolId: school.id,
                        kind: PersonKind.STUDENT,
                        firstName,
                        lastName,
                        nationalId: `00178789${String(n).padStart(2, '0')}`,
                        phone,
                        status:
                            i % 11 === 10
                                ? PersonStatus.INVITED
                                : PersonStatus.ACTIVE,
                    },
                });
                await this.db.enrollment.create({
                    data: {
                        schoolId: school.id,
                        yearId: year.id,
                        classId: schoolClass.id,
                        studentId: person.id,
                    },
                });
                if (phone) {
                    await this.createMember(school.id, password, {
                        kind: PersonKind.STUDENT,
                        firstName,
                        lastName,
                        phone,
                        userName: `student${n + 1}`,
                        positionId: positionByRole[BaseRole.STUDENT].id,
                        personId: person.id,
                    });
                }
                studentIds.push(person.id);
            }
        }

        const guardian1 = await this.createMember(school.id, password, {
            kind: PersonKind.GUARDIAN,
            firstName: 'حسین',
            lastName: 'محمدی',
            phone: '09126666666',
            userName: 'guardian1',
            positionId: positionByRole[BaseRole.GUARDIAN].id,
        });
        const guardian2Person = await this.db.person.create({
            data: {
                schoolId: school.id,
                kind: PersonKind.GUARDIAN,
                firstName: 'زهرا',
                lastName: 'حسینی',
                phone: '09127777777',
                status: PersonStatus.INVITED,
            },
        });
        await this.db.guardianLink.createMany({
            data: [
                {
                    schoolId: school.id,
                    guardianId: guardian1,
                    studentId: studentIds[0],
                    relation: 'پدر',
                    academicVisible: true,
                    financialVisible: true,
                    verifiedAt: new Date(),
                },
                {
                    schoolId: school.id,
                    guardianId: guardian1,
                    studentId: studentIds[1],
                    relation: 'پدر',
                    academicVisible: true,
                    financialVisible: false,
                },
                {
                    schoolId: school.id,
                    guardianId: guardian2Person.id,
                    studentId: studentIds[6],
                    relation: 'مادر',
                    academicVisible: true,
                    financialVisible: true,
                },
            ],
        });

        await this.db.tuitionPlan.create({
            data: {
                schoolId: school.id,
                yearId: year.id,
                gradeId: grades[0].id,
                title: 'شهریه پایه هفتم',
                amountIrr: 80_000_000n,
            },
        });
        this.logger.log(
            `Seeded demo school ${school.id} password=${DEMO_PASSWORD}`
        );
        this.logger.log(
            `token-hash sample ${createHash('sha256').update('demo').digest('hex').slice(0, 8)}`
        );
    }

    private async createMember(
        schoolId: string,
        password: string,
        data: {
            kind: PersonKind;
            firstName: string;
            lastName: string;
            phone: string;
            userName: string;
            positionId: string;
            personId?: string;
        }
    ): Promise<string> {
        const user = await this.db.user.create({
            data: {
                userName: data.userName,
                phone: data.phone,
                passwordHash: password,
                firstName: data.firstName,
                lastName: data.lastName,
                role: UserRole.MEMBER,
                isVerified: true,
            },
        });
        const person = data.personId
            ? await this.db.person.update({
                  where: { id: data.personId },
                  data: { userId: user.id, phone: data.phone },
              })
            : await this.db.person.create({
                  data: {
                      schoolId,
                      userId: user.id,
                      kind: data.kind,
                      firstName: data.firstName,
                      lastName: data.lastName,
                      phone: data.phone,
                      status: PersonStatus.ACTIVE,
                  },
              });
        await this.db.schoolMembership.create({
            data: {
                schoolId,
                userId: user.id,
                personId: person.id,
                positionId: data.positionId,
                status: MembershipStatus.ACTIVE,
            },
        });
        return person.id;
    }
}
