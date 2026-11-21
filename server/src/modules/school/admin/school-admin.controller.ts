import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BaseRole, MoneyUnit } from '@prisma/client';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';
import { PaginationQueryDto } from 'src/common/pagination/pagination.dto';

import { RequirePermission } from '../access/require-permission.decorator';
import type { SchoolContext } from '../access/school-context';
import { Ctx } from '../access/school-context.decorator';
import { SchoolGuards } from '../access/school-guards.decorator';
import { SchoolAdminService } from './school-admin.service';

class PositionDto {
    @IsString()
    name: string;
    @IsEnum(BaseRole)
    baseRole: BaseRole;
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];
}
class PositionUpdateDto {
    @IsOptional()
    @IsString()
    name?: string;
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];
    @IsOptional()
    @IsBoolean()
    isAll?: boolean;
}
class InviteDto {
    @IsString()
    phone: string;
    @IsUUID()
    positionId: string;
    @IsUUID()
    personId: string;
}
class SettingsDto {
    @IsOptional()
    @IsString()
    name?: string;
    @IsOptional()
    @IsString()
    city?: string;
    @IsOptional()
    @IsEnum(MoneyUnit)
    moneyUnit?: MoneyUnit;
    @IsOptional()
    @IsString()
    smsSender?: string;
}

@ApiTags('school.admin')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolAdminController {
    constructor(private readonly admin: SchoolAdminService) {}

    @Get('users')
    @RequirePermission('admin.users.view')
    @ApiEndpoint({ summary: 'School users', paginated: true })
    users(@Ctx() ctx: SchoolContext, @Query() query: PaginationQueryDto) {
        return this.admin.users(ctx, query);
    }

    @Post('users/:id/deactivate')
    @RequirePermission('admin.users.edit')
    @ApiEndpoint({ summary: 'Deactivate membership' })
    deactivate(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.admin.deactivate(ctx, id);
    }

    @Get('positions')
    @RequirePermission('admin.positions.view')
    @ApiEndpoint({ summary: 'List positions' })
    positions(@Ctx() ctx: SchoolContext) {
        return this.admin.positions(ctx);
    }

    @Post('positions')
    @RequirePermission('admin.positions.edit')
    @ApiEndpoint({ summary: 'Create position' })
    createPosition(@Ctx() ctx: SchoolContext, @Body() body: PositionDto) {
        return this.admin.createPosition(ctx, body);
    }

    @Put('positions/:id')
    @RequirePermission('admin.positions.edit')
    @ApiEndpoint({ summary: 'Update position' })
    updatePosition(
        @Ctx() ctx: SchoolContext,
        @Param('id') id: string,
        @Body() body: PositionUpdateDto
    ) {
        return this.admin.updatePosition(ctx, id, body);
    }

    @Post('invitations')
    @RequirePermission('admin.users.create')
    @ApiEndpoint({ summary: 'Invite by phone' })
    invite(@Ctx() ctx: SchoolContext, @Body() body: InviteDto) {
        return this.admin.invite(ctx, body);
    }

    @Post('invitations/:id/resend')
    @RequirePermission('admin.users.create')
    @ApiEndpoint({ summary: 'Resend invitation' })
    resend(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.admin.resendInvite(ctx, id);
    }

    @Get('audit')
    @RequirePermission('admin.audit.view')
    @ApiEndpoint({ summary: 'Audit log', paginated: true })
    audit(@Ctx() ctx: SchoolContext, @Query() query: PaginationQueryDto) {
        return this.admin.audit(ctx, query);
    }

    @Get('settings')
    @RequirePermission('admin.settings.view')
    @ApiEndpoint({ summary: 'School settings' })
    settings(@Ctx() ctx: SchoolContext) {
        return this.admin.settings(ctx);
    }

    @Put('settings')
    @RequirePermission('admin.settings.edit')
    @ApiEndpoint({ summary: 'Update school settings' })
    updateSettings(@Ctx() ctx: SchoolContext, @Body() body: SettingsDto) {
        return this.admin.updateSettings(ctx, body);
    }
}
