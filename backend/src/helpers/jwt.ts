import * as jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
	sub: string;
	type: 'access';
}

export interface RefreshTokenPayload {
	sub: string;
	jti: string;
	type: 'refresh';
}

export function signAccessToken(userId: string): string {
	return jwt.sign(
		{ sub: userId, type: 'access' } as AccessTokenPayload,
		process.env.JWT_ACCESS_SECRET!,
		{ expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' } as jwt.SignOptions,
	);
}

export function signRefreshToken(userId: string, tokenId: string): string {
	return jwt.sign(
		{ sub: userId, jti: tokenId, type: 'refresh' } as RefreshTokenPayload,
		process.env.JWT_REFRESH_SECRET!,
		{ expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions,
	);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
	return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
	return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as RefreshTokenPayload;
}
