import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { buildGitHubAuthURL } from '../../helpers/github';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post('register')
	register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	@Post('login')
	@HttpCode(200)
	login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	@Post('refresh')
	@HttpCode(200)
	refresh(@Body() dto: RefreshDto) {
		return this.authService.refresh(dto.refreshToken);
	}

	@Post('logout')
	@HttpCode(204)
	@UseGuards(JwtAuthGuard)
	logout(@CurrentUser() userId: string, @Body() body: { refreshToken: string }) {
		return this.authService.logout(userId, body.refreshToken);
	}

	@Get('github')
	githubLogin(@Res() res: Response) {
		const state = randomBytes(16).toString('hex');
		res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600_000, sameSite: 'lax' });
		return res.redirect(buildGitHubAuthURL(state));
	}

	@Get('github/callback')
	async githubCallback(
		@Query('code') code: string,
		@Query('state') state: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		const storedState = req.cookies?.['oauth_state'];
		res.clearCookie('oauth_state');

		if (!code || !state || state !== storedState) {
			return res.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
		}

		try {
			const { accessToken, refreshToken } = await this.authService.handleGitHubCallback(code);
			const hash = `accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
			return res.redirect(`${process.env.FRONTEND_URL}/#${hash}`);
		} catch {
			return res.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
		}
	}
}
