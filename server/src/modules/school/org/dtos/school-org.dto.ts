import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoneyUnit } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSchoolDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    name: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    city: string;

    @ApiPropertyOptional({ enum: MoneyUnit })
    @IsOptional()
    @IsEnum(MoneyUnit)
    moneyUnit?: MoneyUnit;
}
