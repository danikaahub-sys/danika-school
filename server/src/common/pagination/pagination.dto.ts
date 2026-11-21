import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 20;
}

export type PaginatedResult<T> = {
    items: T[];
    metadata: {
        currentPage: number;
        itemsPerPage: number;
        totalItems: number;
        totalPages: number;
    };
};

export function paginate<T>(
    items: T[],
    totalItems: number,
    query: PaginationQueryDto
): PaginatedResult<T> {
    const currentPage = query.page;
    const itemsPerPage = query.limit;
    return {
        items,
        metadata: {
            currentPage,
            itemsPerPage,
            totalItems,
            totalPages: Math.max(1, Math.ceil(totalItems / itemsPerPage)),
        },
    };
}

export function skipTake(query: PaginationQueryDto): {
    skip: number;
    take: number;
} {
    return {
        skip: (query.page - 1) * query.limit,
        take: query.limit,
    };
}
