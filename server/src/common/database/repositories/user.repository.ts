import { Injectable } from '@nestjs/common';

import type {
    CreateUserInput,
    UpdateUserInput,
    UserEntity,
} from 'src/common/database/interfaces/user.interface';
import { normalizeIranPhone } from 'src/common/utils/iran-phone';

import { DatabaseService } from '../services/database.service';

@Injectable()
export class UserRepository {
    constructor(private readonly db: DatabaseService) {}

    findById(id: string): Promise<UserEntity | null> {
        return this.db.user.findUnique({ where: { id } });
    }

    findByEmail(email: string): Promise<UserEntity | null> {
        return this.db.user.findUnique({ where: { email } });
    }

    findByPhone(phone: string): Promise<UserEntity | null> {
        return this.db.user.findUnique({
            where: { phone: normalizeIranPhone(phone) },
        });
    }

    findByUserName(userName: string): Promise<UserEntity | null> {
        return this.db.user.findUnique({ where: { userName } });
    }

    async findByIdentifier(identifier: string): Promise<UserEntity | null> {
        const value = identifier.trim();
        if (!value) return null;
        if (value.includes('@')) {
            const byEmail = await this.findByEmail(value);
            if (byEmail) return byEmail;
        }
        return (
            (await this.findByPhone(value)) ??
            (await this.findByUserName(value)) ??
            (await this.findByEmail(value)) ??
            null
        );
    }

    async existsById(id: string): Promise<boolean> {
        const found = await this.db.user.findUnique({
            where: { id },
            select: { id: true },
        });
        return found !== null;
    }

    async existsByEmail(email: string): Promise<boolean> {
        const found = await this.db.user.findUnique({
            where: { email },
            select: { id: true },
        });
        return found !== null;
    }

    async existsByPhone(phone: string): Promise<boolean> {
        const found = await this.db.user.findUnique({
            where: { phone: normalizeIranPhone(phone) },
            select: { id: true },
        });
        return found !== null;
    }

    create(data: CreateUserInput): Promise<UserEntity> {
        const { password, ...rest } = data;
        const payload = { ...rest, passwordHash: password };
        if (payload.phone) {
            payload.phone = normalizeIranPhone(payload.phone);
        }
        return this.db.user.create({ data: payload });
    }

    update(id: string, data: UpdateUserInput): Promise<UserEntity> {
        const payload = { ...data };
        if (payload.phone) {
            payload.phone = normalizeIranPhone(payload.phone);
        }
        return this.db.user.update({ where: { id }, data: payload });
    }

    softDelete(id: string): Promise<UserEntity> {
        return this.db.user.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async hardDeleteByEmail(email: string): Promise<number> {
        const result = await this.db.user.deleteMany({ where: { email } });
        return result.count;
    }
}
