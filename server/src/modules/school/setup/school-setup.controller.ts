import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';

import { RequirePermission } from '../access/require-permission.decorator';
import type { SchoolContext } from '../access/school-context';
import { Ctx } from '../access/school-context.decorator';
import { SchoolGuards } from '../access/school-guards.decorator';
import { SchoolSetupService } from './school-setup.service';

class YearDto {
    @IsString()
    label: string;
    @IsString()
    startsOn: string;
    @IsString()
    endsOn: string;
}
class NameDto {
    @IsString()
    name: string;
}
class ClassDto {
    @IsString()
    name: string;
    @IsUUID()
    gradeId: string;
}
class AssignmentDto {
    @IsUUID()
    classId: string;
    @IsUUID()
    subjectId: string;
    @IsUUID()
    teacherId: string;
}
class PeriodDto {
    @IsString()
    name: string;
    @IsString()
    start: string;
    @IsString()
    end: string;
    @IsOptional()
    @IsInt()
    sortOrder?: number;
}
class SlotDto {
    @IsUUID()
    classId: string;
    @IsInt()
    @Min(1)
    @Max(7)
    day: number;
    @IsUUID()
    periodId: string;
    @IsUUID()
    assignmentId: string;
}
class TimetableDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SlotDto)
    slots: SlotDto[];
}
class ClosureDto {
    @IsString()
    date: string;
    @IsString()
    title: string;
}

@ApiTags('school.setup')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolSetupController {
    constructor(private readonly setup: SchoolSetupService) {}

    @Get()
    @RequirePermission('setup.school.view')
    @ApiEndpoint({ summary: 'Academic setup bundle' })
    bundle(@Ctx() ctx: SchoolContext) {
        return this.setup.bundle(ctx);
    }

    @Post('years')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Create academic year' })
    createYear(@Ctx() ctx: SchoolContext, @Body() body: YearDto) {
        return this.setup.createYear(ctx, body);
    }

    @Put('years/:id/activate')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Activate academic year' })
    activate(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.setup.activateYear(ctx, id);
    }

    @Post('years/rollover')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Rollover into a new year' })
    rollover(@Ctx() ctx: SchoolContext, @Body() body: YearDto) {
        return this.setup.rollover(ctx, body);
    }

    @Post('grades')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Create grade' })
    createGrade(@Ctx() ctx: SchoolContext, @Body() body: NameDto) {
        return this.setup.createGrade(ctx, body.name);
    }

    @Post('classes')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Create class' })
    createClass(@Ctx() ctx: SchoolContext, @Body() body: ClassDto) {
        return this.setup.createClass(ctx, body);
    }

    @Post('subjects')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Create subject' })
    createSubject(@Ctx() ctx: SchoolContext, @Body() body: NameDto) {
        return this.setup.createSubject(ctx, body.name);
    }

    @Post('assignments')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Assign teacher to class/subject' })
    createAssignment(@Ctx() ctx: SchoolContext, @Body() body: AssignmentDto) {
        return this.setup.createAssignment(ctx, body);
    }

    @Post('periods')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Create bell period' })
    createPeriod(@Ctx() ctx: SchoolContext, @Body() body: PeriodDto) {
        return this.setup.createPeriod(ctx, body);
    }

    @Put('timetable')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Replace timetable slots' })
    timetable(@Ctx() ctx: SchoolContext, @Body() body: TimetableDto) {
        return this.setup.upsertTimetable(ctx, body.slots);
    }

    @Post('closures')
    @RequirePermission('setup.school.edit')
    @ApiEndpoint({ summary: 'Create calendar closure' })
    closure(@Ctx() ctx: SchoolContext, @Body() body: ClosureDto) {
        return this.setup.createClosure(ctx, body);
    }
}
