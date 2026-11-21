import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceStatus, MarkStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';

import { RequirePermission } from '../access/require-permission.decorator';
import type { SchoolContext } from '../access/school-context';
import { Ctx } from '../access/school-context.decorator';
import { SchoolGuards } from '../access/school-guards.decorator';
import { SchoolClassroomService } from './school-classroom.service';

class AttendanceRowDto {
    @IsUUID()
    studentId: string;
    @IsEnum(AttendanceStatus)
    status: AttendanceStatus;
}
class MarkAttendanceDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttendanceRowDto)
    rows: AttendanceRowDto[];
}
class StaffAttendanceDto {
    @IsUUID()
    personId: string;
    @IsString()
    date: string;
    @IsEnum(AttendanceStatus)
    status: AttendanceStatus;
}
class HomeworkDto {
    @IsUUID()
    classId: string;
    @IsUUID()
    subjectId: string;
    @IsString()
    title: string;
    @IsString()
    dueOn: string;
}
class DisciplineDto {
    @IsUUID()
    studentId: string;
    @IsUUID()
    classId: string;
    @IsString()
    title: string;
    @IsString()
    date: string;
}
class AssessmentDto {
    @IsUUID()
    assignmentId: string;
    @IsString()
    title: string;
    @IsNumber()
    maximum: number;
    @IsNumber()
    weight: number;
}
class MarkRowDto {
    @IsUUID()
    studentId: string;
    @IsOptional()
    @IsNumber()
    earned?: number;
    @IsOptional()
    @IsEnum(MarkStatus)
    status?: MarkStatus;
}
class MarksDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MarkRowDto)
    rows: MarkRowDto[];
}

@ApiTags('school.classroom')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolClassroomController {
    constructor(private readonly classroom: SchoolClassroomService) {}

    @Get('classes')
    @RequirePermission('classroom.workspace.view')
    @ApiEndpoint({ summary: 'Classes for the actor' })
    classes(@Ctx() ctx: SchoolContext) {
        return this.classroom.classes(ctx);
    }

    @Get('classes/:id')
    @RequirePermission('classroom.workspace.view')
    @ApiEndpoint({ summary: 'Class workspace bundle' })
    workspace(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.classroom.workspace(ctx, id);
    }

    @Get('attendance')
    @RequirePermission('classroom.attendance.view')
    @ApiEndpoint({ summary: 'School-wide attendance' })
    attendance(@Ctx() ctx: SchoolContext) {
        return this.classroom.schoolAttendance(ctx);
    }

    @Get('results')
    @RequirePermission('classroom.grades.view')
    @ApiEndpoint({ summary: 'School-wide marks' })
    results(@Ctx() ctx: SchoolContext) {
        return this.classroom.results(ctx);
    }

    @Put('sessions/:id/attendance')
    @RequirePermission('classroom.attendance.edit')
    @ApiEndpoint({ summary: 'Mark session attendance' })
    mark(
        @Ctx() ctx: SchoolContext,
        @Param('id') id: string,
        @Body() body: MarkAttendanceDto
    ) {
        return this.classroom.markAttendance(ctx, id, body.rows);
    }

    @Post('sessions/:id/submit')
    @RequirePermission('classroom.attendance.edit')
    @ApiEndpoint({ summary: 'Submit session attendance' })
    submit(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.classroom.submitSession(ctx, id);
    }

    @Put('staff-attendance')
    @RequirePermission('classroom.attendance.edit')
    @ApiEndpoint({ summary: 'Mark staff attendance' })
    staff(@Ctx() ctx: SchoolContext, @Body() body: StaffAttendanceDto) {
        return this.classroom.markStaff(ctx, body);
    }

    @Post('homework')
    @RequirePermission('classroom.workspace.edit')
    @ApiEndpoint({ summary: 'Create homework' })
    homework(@Ctx() ctx: SchoolContext, @Body() body: HomeworkDto) {
        return this.classroom.createHomework(ctx, body);
    }

    @Post('homework/:id/publish')
    @RequirePermission('classroom.workspace.edit')
    @ApiEndpoint({ summary: 'Publish homework' })
    publishHomework(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.classroom.publishHomework(ctx, id);
    }

    @Post('discipline')
    @RequirePermission('classroom.workspace.edit')
    @ApiEndpoint({ summary: 'Create discipline note' })
    discipline(@Ctx() ctx: SchoolContext, @Body() body: DisciplineDto) {
        return this.classroom.createDiscipline(ctx, body);
    }

    @Post('assessments')
    @RequirePermission('classroom.grades.edit')
    @ApiEndpoint({ summary: 'Create assessment' })
    assessment(@Ctx() ctx: SchoolContext, @Body() body: AssessmentDto) {
        return this.classroom.createAssessment(ctx, body);
    }

    @Put('assessments/:id/marks')
    @RequirePermission('classroom.grades.edit')
    @ApiEndpoint({ summary: 'Save marks draft' })
    marks(
        @Ctx() ctx: SchoolContext,
        @Param('id') id: string,
        @Body() body: MarksDto
    ) {
        return this.classroom.saveMarks(ctx, id, body.rows);
    }

    @Post('assessments/:id/publish')
    @RequirePermission('classroom.grades.publish')
    @ApiEndpoint({ summary: 'Publish assessment marks' })
    publishAssessment(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.classroom.publishAssessment(ctx, id);
    }

    @Get('students/:id/report-card')
    @RequirePermission('classroom.reports.view')
    @ApiEndpoint({ summary: 'Student report card' })
    reportCard(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.classroom.reportCard(ctx, id);
    }
}
