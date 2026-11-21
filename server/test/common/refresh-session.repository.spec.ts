import { Test } from '@nestjs/testing';

import { RefreshSessionRepository } from 'src/common/database/repositories/refresh-session.repository';
import { DatabaseService } from 'src/common/database/services/database.service';

const mockDelegate = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
};

describe('RefreshSessionRepository', () => {
    let repository: RefreshSessionRepository;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                RefreshSessionRepository,
                {
                    provide: DatabaseService,
                    useValue: { refreshSession: mockDelegate },
                },
            ],
        }).compile();
        repository = module.get(RefreshSessionRepository);
    });

    it('creates a session', async () => {
        mockDelegate.create.mockResolvedValue({ id: '1' });
        await expect(
            repository.create({
                userId: 'u',
                tokenHash: 'h',
                expiresAt: new Date(),
            })
        ).resolves.toEqual({ id: '1' });
    });

    it('finds by id and token hash', async () => {
        mockDelegate.findUnique.mockResolvedValue({ id: '1' });
        await expect(repository.findById('1')).resolves.toEqual({ id: '1' });
        await expect(repository.findByTokenHash('h')).resolves.toEqual({
            id: '1',
        });
    });

    it('revokes one and all for user', async () => {
        mockDelegate.update.mockResolvedValue({ id: '1' });
        mockDelegate.updateMany.mockResolvedValue({ count: 2 });
        await expect(repository.revoke('1')).resolves.toEqual({ id: '1' });
        await expect(repository.revokeAllForUser('u')).resolves.toBe(2);
    });
});
