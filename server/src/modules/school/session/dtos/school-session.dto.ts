import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class SchoolSessionDto {
    @ApiProperty()
    @IsUUID()
    schoolId: string;
}

export class AcceptInvitationDto {
    @ApiProperty()
    @IsString()
    @MinLength(8)
    password: string;
}

export class MembershipItemDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    schoolId: string;

    @ApiProperty()
    schoolName: string;

    @ApiProperty()
    city: string;

    @ApiProperty()
    baseRole: string;

    @ApiProperty()
    positionName: string;

    @ApiProperty()
    status: string;
}

export class SchoolTokenDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    schoolId: string;

    @ApiProperty()
    membershipId: string;
}

export class InvitationPublicDto {
    @ApiProperty()
    schoolName: string;

    @ApiProperty()
    positionName: string;

    @ApiProperty()
    phone: string;

    @ApiPropertyOptional()
    expiresAt: Date;
}
