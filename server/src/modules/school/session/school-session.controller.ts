import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';
import { AuthUser } from 'src/common/request/decorators/auth-user.decorator';
import { GlobalAuth } from 'src/common/request/decorators/global-auth.decorator';
import { PublicRoute } from 'src/common/request/decorators/public.decorator';
import type { IAuthUser } from 'src/common/request/interfaces/request.interface';

import type { SchoolContext } from '../access/school-context';
import { Ctx } from '../access/school-context.decorator';
import { SchoolGuards } from '../access/school-guards.decorator';
import {
    AcceptInvitationDto,
    SchoolSessionDto,
} from './dtos/school-session.dto';
import { SchoolSessionService } from './school-session.service';

@ApiTags('school.session')
@ApiBearerAuth('accessToken')
@SchoolGuards()
@Controller({ path: '/', version: '1' })
export class SchoolSessionController {
    constructor(private readonly sessionService: SchoolSessionService) {}

    @Get('memberships')
    @GlobalAuth()
    @ApiEndpoint({
        summary: 'List school memberships for the current user',
        messageKey: 'school.success.memberships',
    })
    memberships(@AuthUser() user: IAuthUser) {
        return this.sessionService.listMemberships(user.userId);
    }

    @Post('session')
    @GlobalAuth()
    @ApiEndpoint({
        summary: 'Issue a school-scoped access token',
        messageKey: 'school.success.session',
    })
    session(@AuthUser() user: IAuthUser, @Body() body: SchoolSessionDto) {
        return this.sessionService.createSession(user.userId, body.schoolId);
    }

    @Get('me')
    @ApiEndpoint({
        summary: 'Current school session profile',
        messageKey: 'school.success.me',
    })
    me(@Ctx() ctx: SchoolContext) {
        return this.sessionService.me(ctx);
    }

    @Get('invitations/:token')
    @PublicRoute()
    @ApiEndpoint({
        summary: 'Preview an invitation',
        messageKey: 'school.success.invitation',
    })
    invitation(@Param('token') token: string) {
        return this.sessionService.getInvitation(token);
    }

    @Post('invitations/:token/accept')
    @PublicRoute()
    @ApiEndpoint({
        summary: 'Accept an invitation and set password',
        messageKey: 'school.success.invitationAccepted',
    })
    accept(@Param('token') token: string, @Body() body: AcceptInvitationDto) {
        return this.sessionService.acceptInvitation(token, body.password);
    }
}
