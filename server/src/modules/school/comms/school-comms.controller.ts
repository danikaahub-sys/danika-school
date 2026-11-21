import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessageChannel } from '@prisma/client';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsObject,
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
import { SchoolCommsService, type Audience } from './school-comms.service';

class TemplateDto {
    @IsString()
    title: string;
    @IsString()
    body: string;
    @IsEnum(MessageChannel)
    channel: MessageChannel;
}
class TemplateUpdateDto {
    @IsOptional()
    @IsString()
    title?: string;
    @IsOptional()
    @IsString()
    body?: string;
    @IsOptional()
    @IsEnum(MessageChannel)
    channel?: MessageChannel;
}
class AudienceDto implements Audience {
    @IsOptional()
    @IsBoolean()
    all?: boolean;
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    gradeIds?: string[];
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    classIds?: string[];
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roles?: Audience['roles'];
}
class AnnouncementDto {
    @IsString()
    title: string;
    @IsString()
    body: string;
    @IsEnum(MessageChannel)
    channel: MessageChannel;
    @IsObject()
    audience: AudienceDto;
}

@ApiTags('school.communications')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolCommsController {
    constructor(private readonly comms: SchoolCommsService) {}

    @Get()
    @RequirePermission('communications.compose.view')
    @ApiEndpoint({ summary: 'Announcements and templates' })
    async bundle(@Ctx() ctx: SchoolContext) {
        const [announcements, templates] = await Promise.all([
            this.comms.announcements(ctx),
            this.comms.templates(ctx),
        ]);
        return { announcements, templates };
    }

    @Post('announcements')
    @RequirePermission('communications.compose.create')
    @ApiEndpoint({ summary: 'Send announcement' })
    send(@Ctx() ctx: SchoolContext, @Body() body: AnnouncementDto) {
        return this.comms.sendAnnouncement(ctx, body);
    }

    @Post('templates')
    @RequirePermission('communications.compose.create')
    @ApiEndpoint({ summary: 'Create template' })
    createTemplate(@Ctx() ctx: SchoolContext, @Body() body: TemplateDto) {
        return this.comms.createTemplate(ctx, body);
    }

    @Put('templates/:id')
    @RequirePermission('communications.compose.create')
    @ApiEndpoint({ summary: 'Update template' })
    updateTemplate(
        @Ctx() ctx: SchoolContext,
        @Param('id') id: string,
        @Body() body: TemplateUpdateDto
    ) {
        return this.comms.updateTemplate(ctx, id, body);
    }

    @Get('log')
    @RequirePermission('communications.log.view')
    @ApiEndpoint({ summary: 'Delivery log', paginated: true })
    log(@Ctx() ctx: SchoolContext, @Query() query: PaginationQueryDto) {
        return this.comms.deliveries(ctx, query);
    }
}
