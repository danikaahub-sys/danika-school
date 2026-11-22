import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

import { normalizeIranPhone } from 'src/common/utils/iran-phone';

export const OTP_PURPOSES = ['login', 'reset'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export class OtpSendDto {
    @ApiProperty({ example: '09121234567' })
    @Transform(({ value }) =>
        typeof value === 'string' ? normalizeIranPhone(value) : value
    )
    @IsString()
    @IsNotEmpty()
    @Length(8, 20)
    phone: string;

    @ApiProperty({ enum: OTP_PURPOSES, example: 'login' })
    @IsIn(OTP_PURPOSES)
    purpose: OtpPurpose;
}

export class OtpVerifyDto extends OtpSendDto {
    @ApiProperty({ example: '123456' })
    @IsString()
    @Length(6, 6)
    code: string;
}

export class PasswordResetDto {
    @ApiProperty({ example: '09121234567' })
    @Transform(({ value }) =>
        typeof value === 'string' ? normalizeIranPhone(value) : value
    )
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    proof: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    password: string;
}

export class LogoutDto {
    @ApiProperty({ required: false })
    @IsString()
    refreshToken?: string;
}
