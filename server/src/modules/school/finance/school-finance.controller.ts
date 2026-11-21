import {
    Body,
    Controller,
    Get,
    Header,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';
import { PaginationQueryDto } from 'src/common/pagination/pagination.dto';

import { RequirePermission } from '../access/require-permission.decorator';
import type { SchoolContext } from '../access/school-context';
import { Ctx } from '../access/school-context.decorator';
import { SchoolGuards } from '../access/school-guards.decorator';
import { SchoolFinanceService } from './school-finance.service';

class PlanDto {
    @IsUUID()
    gradeId: string;
    @IsString()
    title: string;
    @IsString()
    amountIrr: string;
}
class PlanUpdateDto {
    @IsOptional()
    @IsString()
    title?: string;
    @IsOptional()
    @IsString()
    amountIrr?: string;
}
class ChargeDto {
    @IsUUID()
    studentId: string;
    @IsString()
    title: string;
    @IsString()
    amountIrr: string;
    @IsOptional()
    @IsString()
    dueOn?: string;
    @IsOptional()
    @IsUUID()
    planId?: string;
}
class BatchChargeDto {
    @IsString()
    title: string;
    @IsOptional()
    @IsString()
    amountIrr?: string;
    @IsString()
    dueOn: string;
    @IsOptional()
    @IsUUID()
    gradeId?: string;
    @IsOptional()
    @IsUUID()
    classId?: string;
    @IsOptional()
    @IsUUID()
    planId?: string;
}
class ReceiptDto {
    @IsUUID()
    studentId: string;
    @IsString()
    amountIrr: string;
    @IsString()
    ref: string;
    @IsString()
    date: string;
}

@ApiTags('school.finance')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolFinanceController {
    constructor(private readonly finance: SchoolFinanceService) {}

    @Get('plans')
    @RequirePermission('finance.ledger.view')
    @ApiEndpoint({ summary: 'Tuition plans' })
    plans(@Ctx() ctx: SchoolContext) {
        return this.finance.plans(ctx);
    }

    @Post('plans')
    @RequirePermission('finance.ledger.create')
    @ApiEndpoint({ summary: 'Create tuition plan' })
    createPlan(@Ctx() ctx: SchoolContext, @Body() body: PlanDto) {
        return this.finance.createPlan(ctx, body);
    }

    @Put('plans/:id')
    @RequirePermission('finance.ledger.edit')
    @ApiEndpoint({ summary: 'Update tuition plan' })
    updatePlan(
        @Ctx() ctx: SchoolContext,
        @Param('id') id: string,
        @Body() body: PlanUpdateDto
    ) {
        return this.finance.updatePlan(ctx, id, body);
    }

    @Get('charges')
    @RequirePermission('finance.charges.view')
    @ApiEndpoint({ summary: 'List charges', paginated: true })
    charges(@Ctx() ctx: SchoolContext, @Query() query: PaginationQueryDto) {
        return this.finance.charges(ctx, query);
    }

    @Post('charges')
    @RequirePermission('finance.charges.create')
    @ApiEndpoint({ summary: 'Create charge' })
    createCharge(@Ctx() ctx: SchoolContext, @Body() body: ChargeDto) {
        return this.finance.createCharge(ctx, body);
    }

    @Post('charges/batch')
    @RequirePermission('finance.charges.create')
    @ApiEndpoint({ summary: 'Create charges by grade or class' })
    batch(@Ctx() ctx: SchoolContext, @Body() body: BatchChargeDto) {
        return this.finance.batchCharges(ctx, body);
    }

    @Get('receipts')
    @RequirePermission('finance.receipts.view')
    @ApiEndpoint({ summary: 'List receipts', paginated: true })
    receipts(@Ctx() ctx: SchoolContext, @Query() query: PaginationQueryDto) {
        return this.finance.receipts(ctx, query);
    }

    @Post('receipts')
    @RequirePermission('finance.receipts.create')
    @ApiEndpoint({ summary: 'Create receipt' })
    createReceipt(@Ctx() ctx: SchoolContext, @Body() body: ReceiptDto) {
        return this.finance.createReceipt(ctx, body);
    }

    @Post('receipts/:id/approve')
    @RequirePermission('finance.receipts.approve')
    @ApiEndpoint({ summary: 'Approve and post receipt' })
    approve(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.finance.approveReceipt(ctx, id);
    }

    @Post('receipts/:id/reverse')
    @RequirePermission('finance.receipts.approve')
    @ApiEndpoint({ summary: 'Reverse a posted receipt' })
    reverse(@Ctx() ctx: SchoolContext, @Param('id') id: string) {
        return this.finance.reverseReceipt(ctx, id);
    }

    @Get('ledger/:studentId')
    @RequirePermission('finance.ledger.view')
    @ApiEndpoint({ summary: 'Student ledger' })
    ledger(@Ctx() ctx: SchoolContext, @Param('studentId') studentId: string) {
        return this.finance.ledger(ctx, studentId);
    }

    @Get('reports')
    @RequirePermission('finance.reports.view')
    @ApiEndpoint({ summary: 'Finance totals, monthly, debtors' })
    reports(@Ctx() ctx: SchoolContext) {
        return this.finance.reports(ctx);
    }

    @Get('reports/export')
    @RequirePermission('finance.reports.export')
    @Header('Content-Type', 'text/csv; charset=utf-8')
    @ApiEndpoint({ summary: 'Export finance report CSV' })
    exportCsv(@Ctx() ctx: SchoolContext) {
        return this.finance.exportCsv(ctx);
    }
}
