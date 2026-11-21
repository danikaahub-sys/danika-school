import { Injectable } from '@nestjs/common';
import type { RefreshSession } from '@prisma/client';

import { DatabaseService } from '../services/database.service';

@Injectable()
export class RefreshSessionRepository {
    constructor(private readonly db: DatabaseService) {}

    create(data: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
    }): Promise<RefreshSession> {
        return this.db.refreshSession.create({ data });
    }

    findById(id: string): Promise<RefreshSession | null> {
        return this.db.refreshSession.findUnique({ where: { id } });
    }

    findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
        return this.db.refreshSession.findUnique({ where: { tokenHash } });
    }

    revoke(id: string): Promise<RefreshSession> {
        return this.db.refreshSession.update({
            where: { id },
            data: { revokedAt: new Date() },
        });
    }

    async revokeAllForUser(userId: string): Promise<number> {
        const result = await this.db.refreshSession.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return result.count;
    }
}
