import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiEndpoint } from 'src/common/doc/decorators/doc.api-endpoint.decorator';
import { AuthUser } from 'src/common/request/decorators/auth-user.decorator';
import { PublicRoute } from 'src/common/request/decorators/public.decorator';
import { JwtRefreshGuard } from 'src/common/request/guards/jwt-refresh.guard';
import type { IAuthUser } from 'src/common/request/interfaces/request.interface';

import { UserLoginDto } from '../dtos/auth.login.dto';
import {
    OtpSendDto,
    OtpVerifyDto,
    PasswordResetDto,
} from '../dtos/auth.otp.dto';
import {
    AuthRefreshResponseDto,
    AuthResponseDto,
} from '../dtos/auth.response.dto';
import { UserCreateDto } from '../dtos/auth.signup.dto';
import { AuthService } from '../services/auth.service';

@ApiTags('public.auth')
@PublicRoute()
@Controller({ path: '/auth', version: '1' })
export class AuthPublicController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @ApiEndpoint({
        summary: 'User login',
        serialization: AuthResponseDto,
        messageKey: 'auth.success.loggedIn',
    })
    login(@Body() payload: UserLoginDto): Promise<AuthResponseDto> {
        return this.authService.login(payload);
    }

    @Post('signup')
    @ApiEndpoint({
        summary: 'User signup',
        serialization: AuthResponseDto,
        httpStatus: HttpStatus.CREATED,
        messageKey: 'auth.success.signedUp',
    })
    signup(@Body() payload: UserCreateDto): Promise<AuthResponseDto> {
        return this.authService.signup(payload);
    }

    @Post('otp/send')
    @ApiEndpoint({
        summary: 'Send login or reset OTP',
        messageKey: 'auth.success.otpSent',
    })
    sendOtp(@Body() payload: OtpSendDto) {
        return this.authService.sendOtp(payload);
    }

    @Post('otp/verify')
    @ApiEndpoint({
        summary: 'Verify OTP',
        messageKey: 'auth.success.otpVerified',
    })
    verifyOtp(@Body() payload: OtpVerifyDto) {
        return this.authService.verifyOtp(payload);
    }

    @Post('password/reset')
    @ApiEndpoint({
        summary: 'Reset password with OTP proof',
        messageKey: 'auth.success.passwordReset',
    })
    resetPassword(@Body() payload: PasswordResetDto) {
        return this.authService.resetPassword(payload);
    }

    @Get('refresh-token')
    @UseGuards(JwtRefreshGuard)
    @ApiBearerAuth('refreshToken')
    @ApiEndpoint({
        summary: 'Refresh tokens',
        serialization: AuthRefreshResponseDto,
        messageKey: 'auth.success.tokensRefreshed',
    })
    refreshTokens(
        @AuthUser() user: IAuthUser
    ): Promise<AuthRefreshResponseDto> {
        return this.authService.refreshTokens(user);
    }

    @Post('refresh')
    @UseGuards(JwtRefreshGuard)
    @ApiBearerAuth('refreshToken')
    @ApiEndpoint({
        summary: 'Rotate refresh tokens',
        serialization: AuthRefreshResponseDto,
        messageKey: 'auth.success.tokensRefreshed',
    })
    refresh(@AuthUser() user: IAuthUser): Promise<AuthRefreshResponseDto> {
        return this.authService.refreshTokens(user);
    }

    @Post('logout')
    @UseGuards(JwtRefreshGuard)
    @ApiBearerAuth('refreshToken')
    @ApiEndpoint({
        summary: 'Revoke refresh session',
        messageKey: 'auth.success.loggedOut',
    })
    logout(@AuthUser() user: IAuthUser) {
        return this.authService.logout(user.userId, user.sessionId);
    }
}
