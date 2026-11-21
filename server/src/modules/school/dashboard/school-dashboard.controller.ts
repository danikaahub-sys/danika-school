import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';

import { RequirePermission } from '../access/require-permission.decorator';
import type { SchoolContext } from '../access/school-context';
import { Ctx } from '../access/school-context.decorator';
import { SchoolGuards } from '../access/school-guards.decorator';
import { SchoolDashboardService } from './school-dashboard.service';

class GranularityQueryDto {
    @IsOptional()
    @IsIn(['day', 'week', 'month'])
    granularity: 'day' | 'week' | 'month' = 'day';
}

@ApiTags('school.dashboard')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolDashboardController {
    constructor(private readonly dashboard: SchoolDashboardService) {}

    @Get('dashboard/attention')
    @RequirePermission('home.dashboard.view')
    @ApiEndpoint({ summary: 'Attention counts' })
    attention(@Ctx() ctx: SchoolContext) {
        return this.dashboard.attention(ctx);
    }

    @Get('dashboard/home')
    @RequirePermission('home.dashboard.view')
    @ApiEndpoint({ summary: 'Role-shaped home' })
    home(@Ctx() ctx: SchoolContext) {
        return this.dashboard.home(ctx);
    }

    @Get('stats/attendance')
    @RequirePermission('home.dashboard.view')
    @ApiEndpoint({ summary: 'Attendance series' })
    attendance(@Ctx() ctx: SchoolContext, @Query() query: GranularityQueryDto) {
        return this.dashboard.attendanceSeries(ctx, query.granularity);
    }

    @Get('stats/finance/collections')
    @RequirePermission('home.dashboard.view')
    @ApiEndpoint({ summary: 'Collections series' })
    collections(@Ctx() ctx: SchoolContext) {
        return this.dashboard.collectionsSeries(ctx);
    }

    @Get('stats/grades/distribution')
    @RequirePermission('home.dashboard.view')
    @ApiEndpoint({ summary: 'Grade distribution' })
    grades(@Ctx() ctx: SchoolContext) {
        return this.dashboard.gradeDistribution(ctx);
    }

    @Get('stats/enrollment')
    @RequirePermission('home.dashboard.view')
    @ApiEndpoint({ summary: 'Enrollment by class' })
    enrollment(@Ctx() ctx: SchoolContext) {
        return this.dashboard.enrollmentSeries(ctx);
    }
}
