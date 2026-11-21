import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
    BaseRole,
    MembershipStatus,
    MoneyUnit,
    OrgMemberRole,
    PersonKind,
    PersonStatus,
} from '@prisma/client';

import { DatabaseService } from 'src/common/database/services/database.service';
import {
    academicYearInput,
    SchoolOrgService,
} from 'src/modules/school/org/school-org.service';

describe('academicYearInput', () => {
    it('starts the year in September of the current UTC year', () => {
        expect(academicYearInput(new Date('2026-11-21T00:00:00Z'))).toEqual({
            label: '2026–2027',
            startsOn: new Date(Date.UTC(2026, 8, 23)),
            endsOn: new Date(Date.UTC(2027, 5, 21)),
            isActive: true,
        });
    });

    it('uses the previous September before the school year starts', () => {
        expect(academicYearInput(new Date('2026-03-01T00:00:00Z'))).toEqual({
            label: '2025–2026',
            startsOn: new Date(Date.UTC(2025, 8, 23)),
            endsOn: new Date(Date.UTC(2026, 5, 21)),
            isActive: true,
        });
    });
});

describe('SchoolOrgService', () => {
    let service: SchoolOrgService;
    const db = {
        organizationMember: { findMany: jest.fn(), findFirst: jest.fn() },
        user: { findUnique: jest.fn() },
        school: { create: jest.fn() },
        position: { create: jest.fn() },
        academicYear: { create: jest.fn() },
        person: { create: jest.fn() },
        schoolMembership: { create: jest.fn() },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        db.$transaction.mockImplementation(async (arg: unknown) => {
            if (typeof arg === 'function') {
                return (arg as (tx: typeof db) => Promise<unknown>)(db);
            }
            return arg;
        });
        db.position.create.mockImplementation(
            async ({
                data,
            }: {
                data: { baseRole: BaseRole; name: string };
            }) => ({
                id: `pos-${data.baseRole}`,
                ...data,
            })
        );
        const module = await Test.createTestingModule({
            providers: [
                SchoolOrgService,
                { provide: DatabaseService, useValue: db },
            ],
        }).compile();
        service = module.get(SchoolOrgService);
    });

    it('lists live organizations the user owns or admins', async () => {
        db.organizationMember.findMany.mockResolvedValue([
            {
                role: OrgMemberRole.OWNER,
                organization: {
                    id: 'org-1',
                    name: 'Danika',
                    deletedAt: null,
                    schools: [
                        {
                            id: 's1',
                            name: 'School A',
                            city: 'Tehran',
                            moneyUnit: MoneyUnit.TOMAN,
                        },
                    ],
                },
            },
            {
                role: OrgMemberRole.ADMIN,
                organization: {
                    id: 'org-dead',
                    name: 'Gone',
                    deletedAt: new Date(),
                    schools: [],
                },
            },
        ]);
        await expect(service.listOrganizations('u1')).resolves.toEqual([
            {
                id: 'org-1',
                name: 'Danika',
                role: OrgMemberRole.OWNER,
                schools: [
                    {
                        id: 's1',
                        name: 'School A',
                        city: 'Tehran',
                        moneyUnit: MoneyUnit.TOMAN,
                    },
                ],
            },
        ]);
    });

    it('rejects create when the user is not the org owner', async () => {
        db.organizationMember.findFirst.mockResolvedValue(null);
        await expect(
            service.createSchool('u1', 'org-1', {
                name: 'New',
                city: 'Tehran',
            })
        ).rejects.toThrow(HttpException);
    });

    it('rejects create when the user record is missing', async () => {
        db.organizationMember.findFirst.mockResolvedValue({ id: 'om' });
        db.user.findUnique.mockResolvedValue(null);
        await expect(
            service.createSchool('u1', 'org-1', {
                name: 'New',
                city: 'Tehran',
            })
        ).rejects.toThrow(HttpException);
    });

    it('creates a school with principal membership and defaults', async () => {
        db.organizationMember.findFirst.mockResolvedValue({ id: 'om' });
        db.user.findUnique.mockResolvedValue({
            id: 'u1',
            userName: 'owner',
            firstName: 'Sara',
            lastName: 'Karimi',
            phone: '09120000000',
        });
        db.school.create.mockResolvedValue({
            id: 's2',
            name: 'School B',
            city: 'Isfahan',
            moneyUnit: MoneyUnit.IRR,
        });
        db.person.create.mockResolvedValue({ id: 'p2' });
        db.schoolMembership.create.mockResolvedValue({ id: 'm2' });

        await expect(
            service.createSchool('u1', 'org-1', {
                name: 'School B',
                city: 'Isfahan',
                moneyUnit: MoneyUnit.IRR,
            })
        ).resolves.toEqual({
            organizationId: 'org-1',
            schoolId: 's2',
            membershipId: 'm2',
            name: 'School B',
            city: 'Isfahan',
            moneyUnit: MoneyUnit.IRR,
        });

        expect(db.school.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    organizationId: 'org-1',
                    moneyUnit: MoneyUnit.IRR,
                    settings: { create: { locale: 'fa' } },
                }),
            })
        );
        expect(db.position.create).toHaveBeenCalledTimes(6);
        expect(db.person.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'u1',
                kind: PersonKind.STAFF,
                firstName: 'Sara',
                lastName: 'Karimi',
                phone: '09120000000',
                status: PersonStatus.ACTIVE,
            }),
        });
        expect(db.schoolMembership.create).toHaveBeenCalledWith({
            data: {
                schoolId: 's2',
                userId: 'u1',
                personId: 'p2',
                positionId: `pos-${BaseRole.PRINCIPAL}`,
                status: MembershipStatus.ACTIVE,
            },
        });
        expect(db.academicYear.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                schoolId: 's2',
                isActive: true,
            }),
        });
    });

    it('fills missing names and money unit from defaults', async () => {
        db.organizationMember.findFirst.mockResolvedValue({ id: 'om' });
        db.user.findUnique.mockResolvedValue({
            id: 'u1',
            userName: 'owner',
            firstName: null,
            lastName: null,
            phone: null,
        });
        db.school.create.mockResolvedValue({
            id: 's3',
            name: 'School C',
            city: 'Shiraz',
            moneyUnit: MoneyUnit.TOMAN,
        });
        db.person.create.mockResolvedValue({ id: 'p3' });
        db.schoolMembership.create.mockResolvedValue({ id: 'm3' });

        await expect(
            service.createSchool('u1', 'org-1', {
                name: 'School C',
                city: 'Shiraz',
            })
        ).resolves.toEqual(
            expect.objectContaining({
                schoolId: 's3',
                moneyUnit: MoneyUnit.TOMAN,
            })
        );
        expect(db.school.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ moneyUnit: MoneyUnit.TOMAN }),
            })
        );
        expect(db.person.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                firstName: 'owner',
                lastName: '',
                phone: null,
            }),
        });
    });
});
