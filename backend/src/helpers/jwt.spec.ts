import * as jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt';

describe('jwt helpers', () => {
	describe('signAccessToken / verifyAccessToken', () => {
		it('produces a valid JWT with correct payload', () => {
			const token = signAccessToken('user-1');
			const payload = verifyAccessToken(token);

			expect(payload.sub).toBe('user-1');
			expect(payload.type).toBe('access');
		});

		it('throws when verified with wrong secret', () => {
			const token = jwt.sign({ sub: 'user-1', type: 'access' }, 'wrong-secret');
			expect(() => verifyAccessToken(token)).toThrow();
		});

		it('throws on expired token', () => {
			const token = jwt.sign({ sub: 'user-1', type: 'access' }, process.env.JWT_ACCESS_SECRET!, {
				expiresIn: '-1s',
			});
			expect(() => verifyAccessToken(token)).toThrow();
		});
	});

	describe('signRefreshToken / verifyRefreshToken', () => {
		it('produces a valid JWT with correct payload', () => {
			const token = signRefreshToken('user-1', 'token-id-abc');
			const payload = verifyRefreshToken(token);

			expect(payload.sub).toBe('user-1');
			expect(payload.jti).toBe('token-id-abc');
			expect(payload.type).toBe('refresh');
		});

		it('throws when verified with wrong secret', () => {
			const token = jwt.sign({ sub: 'user-1', jti: 'id', type: 'refresh' }, 'wrong-secret');
			expect(() => verifyRefreshToken(token)).toThrow();
		});

		it('access token cannot be verified as refresh token (different secret)', () => {
			// access tokens are signed with JWT_ACCESS_SECRET; verifyRefreshToken uses JWT_REFRESH_SECRET
			const access = signAccessToken('user-1');
			expect(() => verifyRefreshToken(access)).toThrow();
		});
	});
});
