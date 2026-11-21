import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';
import { AuthUser } from 'src/common/request/decorators/auth-user.decorator';
import { GlobalAuth } from 'src/common/request/decorators/global-auth.decorator';
import type { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { SchoolGuards } from '../access/school-guards.decorator';
import { CreateSchoolDto } from './dtos/school-org.dto';
import { SchoolOrgService } from './school-org.service';

@ApiTags('school.org')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@GlobalAuth()
@Controller({ path: '/', version: '1' })
export class SchoolOrgController {
    constructor(private readonly orgService: SchoolOrgService) {}

    @Get()
    @ApiEndpoint({
        summary:
            'List organizations and schools the current user owns or admins',
        messageKey: 'school.success.organizations',
    })
    list(@AuthUser() user: IAuthUser) {
        return this.orgService.listOrganizations(user.userId);
    }

    @Post(':organizationId/schools')
    @ApiEndpoint({
        summary: 'Create a school in an organization the current user owns',
        messageKey: 'school.success.schoolCreated',
    })
    create(
        @AuthUser() user: IAuthUser,
        @Param('organizationId', ParseUUIDPipe) organizationId: string,
        @Body() body: CreateSchoolDto
    ) {
        return this.orgService.createSchool(user.userId, organizationId, body);
    }
}
