import { Test, type TestingModule } from '@nestjs/testing';

import { UserRole } from 'src/common/database/enums/role.enum';
import { UserRepository } from 'src/common/database/repositories/user.repository';
import { DatabaseService } from 'src/common/database/services/database.service';

const mockUserDelegate = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
};

const mockDb = { user: mockUserDelegate };

describe('UserRepository', () => {
    let repository: UserRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRepository,
                { provide: DatabaseService, useValue: mockDb },
            ],
        }).compile();

        repository = module.get<UserRepository>(UserRepository);
    });

    it('should be defined', () => expect(repository).toBeDefined());

    describe('findById', () => {
        it('returns user when found', async () => {
            const user = { id: '1', email: 'a@b.com' };
            mockUserDelegate.findUnique.mockResolvedValue(user);
            await expect(repository.findById('1')).resolves.toEqual(user);
            expect(mockUserDelegate.findUnique).toHaveBeenCalledWith({
                where: { id: '1' },
            });
        });

        it('returns null when not found', async () => {
            mockUserDelegate.findUnique.mockResolvedValue(null);
            await expect(repository.findById('1')).resolves.toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('returns user when found', async () => {
            const user = { id: '1', email: 'a@b.com' };
            mockUserDelegate.findUnique.mockResolvedValue(user);
            await expect(repository.findByEmail('a@b.com')).resolves.toEqual(
                user
            );
            expect(mockUserDelegate.findUnique).toHaveBeenCalledWith({
                where: { email: 'a@b.com' },
            });
        });

        it('returns null when not found', async () => {
            mockUserDelegate.findUnique.mockResolvedValue(null);
            await expect(
                repository.findByEmail('missing@b.com')
            ).resolves.toBeNull();
        });
    });

    describe('existsById', () => {
        it('returns true when user exists', async () => {
            mockUserDelegate.findUnique.mockResolvedValue({ id: '1' });
            await expect(repository.existsById('1')).resolves.toBe(true);
            expect(mockUserDelegate.findUnique).toHaveBeenCalledWith({
                where: { id: '1' },
                select: { id: true },
            });
        });

        it('returns false when user does not exist', async () => {
            mockUserDelegate.findUnique.mockResolvedValue(null);
            await expect(repository.existsById('1')).resolves.toBe(false);
        });
    });

    describe('findByPhone', () => {
        it('returns user when found', async () => {
            mockUserDelegate.findUnique.mockResolvedValue({ id: '1' });
            await expect(repository.findByPhone('0912')).resolves.toEqual({
                id: '1',
            });
        });

        it('looks up the canonical 09 form of a 10-digit mobile', async () => {
            mockUserDelegate.findUnique.mockResolvedValue({ id: '1' });
            await repository.findByPhone('9114174021');
            expect(mockUserDelegate.findUnique).toHaveBeenCalledWith({
                where: { phone: '09114174021' },
            });
        });
    });

    describe('findByUserName', () => {
        it('returns user when found', async () => {
            mockUserDelegate.findUnique.mockResolvedValue({ id: '1' });
            await expect(repository.findByUserName('bob')).resolves.toEqual({
                id: '1',
            });
        });
    });

    describe('findByIdentifier', () => {
        it('returns null for empty identifier', async () => {
            await expect(repository.findByIdentifier('  ')).resolves.toBeNull();
        });

        it('prefers email when identifier contains @', async () => {
            mockUserDelegate.findUnique.mockResolvedValueOnce({ id: 'e' });
            await expect(
                repository.findByIdentifier('a@b.com')
            ).resolves.toEqual({ id: 'e' });
        });

        it('falls through phone, username, then email', async () => {
            mockUserDelegate.findUnique
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: 'u' });
            await expect(repository.findByIdentifier('bob')).resolves.toEqual({
                id: 'u',
            });
        });

        it('falls through after a missing email identifier', async () => {
            mockUserDelegate.findUnique
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);
            await expect(
                repository.findByIdentifier('missing@x.com')
            ).resolves.toBeNull();
        });
    });

    describe('existsByPhone', () => {
        it('returns true when user exists', async () => {
            mockUserDelegate.findUnique.mockResolvedValue({ id: '1' });
            await expect(repository.existsByPhone('0912')).resolves.toBe(true);
        });

        it('returns false when user does not exist', async () => {
            mockUserDelegate.findUnique.mockResolvedValue(null);
            await expect(repository.existsByPhone('0912')).resolves.toBe(false);
        });
    });

    describe('existsByEmail', () => {
        it('returns true when user exists', async () => {
            mockUserDelegate.findUnique.mockResolvedValue({ id: '1' });
            await expect(repository.existsByEmail('a@b.com')).resolves.toBe(
                true
            );
            expect(mockUserDelegate.findUnique).toHaveBeenCalledWith({
                where: { email: 'a@b.com' },
                select: { id: true },
            });
        });

        it('returns false when user does not exist', async () => {
            mockUserDelegate.findUnique.mockResolvedValue(null);
            await expect(
                repository.existsByEmail('missing@b.com')
            ).resolves.toBe(false);
        });
    });

    describe('create', () => {
        it('maps password to passwordHash and creates user', async () => {
            const created = {
                id: '1',
                email: 'a@b.com',
                passwordHash: 'hashed',
            };
            mockUserDelegate.create.mockResolvedValue(created);

            const input = {
                email: 'a@b.com',
                password: 'hashed',
                userName: 'user1',
                role: UserRole.MEMBER,
            };
            await expect(repository.create(input)).resolves.toEqual(created);
            expect(mockUserDelegate.create).toHaveBeenCalledWith({
                data: {
                    email: 'a@b.com',
                    userName: 'user1',
                    role: UserRole.MEMBER,
                    passwordHash: 'hashed',
                },
            });
        });

        it('stores Iranian mobiles in 09 form', async () => {
            mockUserDelegate.create.mockResolvedValue({ id: '1' });
            await repository.create({
                phone: '9114174021',
                password: 'hashed',
                userName: 'admin_09114174021',
                role: UserRole.ADMIN,
            });
            expect(mockUserDelegate.create).toHaveBeenCalledWith({
                data: {
                    phone: '09114174021',
                    userName: 'admin_09114174021',
                    role: UserRole.ADMIN,
                    passwordHash: 'hashed',
                },
            });
        });
    });

    describe('update', () => {
        it('updates user by id', async () => {
            const updated = { id: '1', email: 'new@b.com' };
            mockUserDelegate.update.mockResolvedValue(updated);

            await expect(
                repository.update('1', { email: 'new@b.com' })
            ).resolves.toEqual(updated);
            expect(mockUserDelegate.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { email: 'new@b.com' },
            });
        });

        it('normalizes phone on update', async () => {
            mockUserDelegate.update.mockResolvedValue({ id: '1' });
            await repository.update('1', { phone: '9114174021' });
            expect(mockUserDelegate.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { phone: '09114174021' },
            });
        });
    });

    describe('softDelete', () => {
        it('sets deletedAt and returns updated user', async () => {
            const deleted = { id: '1', deletedAt: new Date() };
            mockUserDelegate.update.mockResolvedValue(deleted);

            await expect(repository.softDelete('1')).resolves.toEqual(deleted);
            expect(mockUserDelegate.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { deletedAt: expect.any(Date) },
            });
        });
    });

    describe('hardDeleteByEmail', () => {
        it('deletes matching users and returns count', async () => {
            mockUserDelegate.deleteMany.mockResolvedValue({ count: 1 });
            await expect(repository.hardDeleteByEmail('a@b.com')).resolves.toBe(
                1
            );
            expect(mockUserDelegate.deleteMany).toHaveBeenCalledWith({
                where: { email: 'a@b.com' },
            });
        });

        it('returns 0 when no users matched', async () => {
            mockUserDelegate.deleteMany.mockResolvedValue({ count: 0 });
            await expect(
                repository.hardDeleteByEmail('none@b.com')
            ).resolves.toBe(0);
        });
    });
});
