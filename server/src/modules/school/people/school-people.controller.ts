import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PersonKind } from '@prisma/client';
import {
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
import { SchoolPeopleService } from './school-people.service';

class PeopleQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsEnum(PersonKind)
    kind?: PersonKind;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsUUID()
    classId?: string;
}

class PersonDto {
    @IsEnum(PersonKind)
    kind: PersonKind;
    @IsString()
    firstName: string;
    @IsString()
    lastName: string;
    @IsOptional()
    @IsString()
    nationalId?: string;
    @IsOptional()
    @IsString()
    phone?: string;
    @IsOptional()
    @IsUUID()
    classId?: string;
}

class LinkDto {
    @IsUUID()
    guardianId: string;
    @IsUUID()
    studentId: string;
    @IsString()
    relation: string;
}

class VisibilityDto {
    @IsOptional()
    @IsBoolean()
    academicVisible?: boolean;
    @IsOptional()
    @IsBoolean()
    financialVisible?: boolean;
}

class ImportDto {
    @IsString()
    csv: string;
}

@ApiTags('school.people')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolPeopleController {
    constructor(private readonly people: SchoolPeopleService) {}

    @Get()
    @RequirePermission('people.directory.view')
    @ApiEndpoint({ summary: 'List people', paginated: true })
    list(@Ctx() ctx: SchoolContext, @Query() query: PeopleQueryDto) {
        return this.people.list(ctx, query.kind, query);
    }

    @Get('imports/:id')
    @RequirePermission('people.import.view')
    @ApiEndpoint({ summary: 'Import job status' })
    importStatus(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.people.getImport(ctx, id);
    }

    @Get(':id')
    @RequirePermission('people.directory.view')
    @ApiEndpoint({ summary: 'Person record' })
    detail(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.people.detail(ctx, id);
    }

    @Post()
    @RequirePermission('people.directory.create')
    @ApiEndpoint({ summary: 'Create person' })
    create(@Ctx() ctx: SchoolContext, @Body() body: PersonDto) {
        return this.people.create(ctx, body);
    }

    @Put(':id')
    @RequirePermission('people.directory.edit')
    @ApiEndpoint({ summary: 'Update person' })
    update(
        @Ctx() ctx: SchoolContext,
        @Param('id') id: string,
        @Body() body: Partial<PersonDto>
    ) {
        return this.people.update(ctx, id, body);
    }

    @Post(':id/archive')
    @RequirePermission('people.directory.archive')
    @ApiEndpoint({ summary: 'Archive person' })
    archive(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.people.archive(ctx, id);
    }

    @Post('links')
    @RequirePermission('people.guardians.edit')
    @ApiEndpoint({ summary: 'Create guardian link' })
    link(@Ctx() ctx: SchoolContext, @Body() body: LinkDto) {
        return this.people.createLink(ctx, body);
    }

    @Post('links/:id/verify')
    @RequirePermission('people.guardians.approve')
    @ApiEndpoint({ summary: 'Verify guardian link' })
    verify(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.people.verifyLink(ctx, id);
    }

    @Put('links/:id')
    @RequirePermission('people.guardians.edit')
    @ApiEndpoint({ summary: 'Update guardian visibility' })
    visibility(
        @Ctx() ctx: SchoolContext,
        @Param('id') id: string,
        @Body() body: VisibilityDto
    ) {
        return this.people.setLinkVisibility(ctx, id, body);
    }

    @Post('import')
    @RequirePermission('people.import.create')
    @ApiEndpoint({ summary: 'Import people CSV' })
    importCsv(@Ctx() ctx: SchoolContext, @Body() body: ImportDto) {
        return this.people.enqueueImport(ctx, body.csv);
    }
}
