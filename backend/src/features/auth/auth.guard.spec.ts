import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { signAccessToken } from '../../helpers/jwt';

function makeContext(authHeader: string): ExecutionContext {
	const req: any = { headers: { authorization: authHeader }, userId: undefined };
	return {
		switchToHttp: () => ({ getRequest: () => req }),
	} as any;
}

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard;

	beforeEach(() => {
		guard = new JwtAuthGuard();
	});

	it('allows a valid Bearer token and sets req.userId', () => {
		const token = signAccessToken('user-abc');
		const ctx = makeContext(`Bearer ${token}`);
		const req: any = ctx.switchToHttp().getRequest();

		expect(guard.canActivate(ctx)).toBe(true);
		expect(req.userId).toBe('user-abc');
	});

	it('throws when authorization header is missing', () => {
		expect(() => guard.canActivate(makeContext(''))).toThrow(UnauthorizedException);
	});

	it('throws when header does not start with Bearer', () => {
		expect(() => guard.canActivate(makeContext('Token abc'))).toThrow(UnauthorizedException);
	});

	it('throws for a malformed token', () => {
		expect(() => guard.canActivate(makeContext('Bearer not.a.jwt'))).toThrow(
			UnauthorizedException,
		);
	});

	it('throws for a token signed with wrong secret', () => {
		const bad = require('jsonwebtoken').sign({ sub: 'x', type: 'access' }, 'wrong-secret');
		expect(() => guard.canActivate(makeContext(`Bearer ${bad}`))).toThrow(UnauthorizedException);
	});
});
