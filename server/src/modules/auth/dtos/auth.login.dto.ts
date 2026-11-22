import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

import { normalizeIranPhone } from 'src/common/utils/iran-phone';

const LOGIN_PASSWORD_MIN_LENGTH = 7;

export class UserLoginDto {
    @ApiProperty({
        example: faker.internet.email(),
        description: 'Email, phone or username',
        required: true,
    })
    @Transform(({ value }) =>
        typeof value === 'string' ? normalizeIranPhone(value) : value
    )
    @IsString()
    @IsNotEmpty()
    public identifier: string;

    @ApiProperty({
        example: 'schoolpass',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(LOGIN_PASSWORD_MIN_LENGTH)
    public password: string;
}
