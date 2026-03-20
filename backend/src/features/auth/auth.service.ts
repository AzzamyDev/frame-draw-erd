import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../helpers/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../helpers/jwt';
import { formatUser } from '../../helpers/user';
import { exchangeGitHubCode, fetchGitHubUser, fetchGitHubPrimaryEmail } from '../../helpers/github';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
	constructor(private prisma: PrismaService) {}

	private async createRefreshToken(userId: string): Promise<string> {
		const record = await this.prisma.refreshToken.create({
			data: {
				token: randomBytes(20).toString('hex'),
				userId,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			},
		});
		return signRefreshToken(userId, record.id);
	}

	async register(dto: RegisterDto) {
		const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
		if (existing) throw new ConflictException('Email already registered');

		const passwordHash = await hashPassword(dto.password);
		const user = await this.prisma.user.create({
			data: { email: dto.email, passwordHash, name: dto.name },
		});

		// Project + refresh token are independent — run in parallel
		const [, refreshToken] = await Promise.all([
			this.prisma.project.create({ data: { userId: user.id, name: 'My First Project' } }),
			this.createRefreshToken(user.id),
		]);

		return { user: formatUser(user), accessToken: signAccessToken(user.id), refreshToken };
	}

	async login(dto: LoginDto) {
		const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
		if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

		const valid = await verifyPassword(dto.password, user.passwordHash);
		if (!valid) throw new UnauthorizedException('Invalid credentials');

		const refreshToken = await this.createRefreshToken(user.id);
		return { user: formatUser(user), accessToken: signAccessToken(user.id), refreshToken };
	}

	async refresh(rawRefreshToken: string) {
		let payload: any;
		try {
			payload = verifyRefreshToken(rawRefreshToken);
		} catch {
			throw new UnauthorizedException('Invalid or expired refresh token');
		}

		const record = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });

		if (
			!record ||
			record.revokedAt ||
			record.expiresAt < new Date() ||
			record.userId !== payload.sub
		) {
			// Potential reuse attack — revoke all active tokens for this user
			if (record) {
				await this.prisma.refreshToken.updateMany({
					where: { userId: record.userId, revokedAt: null },
					data: { revokedAt: new Date() },
				});
			}
			throw new UnauthorizedException('Invalid or expired refresh token');
		}

		// Revoke old token and mint new pair in parallel
		const [, refreshToken] = await Promise.all([
			this.prisma.refreshToken.update({
				where: { id: record.id },
				data: { revokedAt: new Date() },
			}),
			this.createRefreshToken(record.userId),
		]);

		return { accessToken: signAccessToken(record.userId), refreshToken };
	}

	async logout(userId: string, rawRefreshToken: string) {
		try {
			const payload = verifyRefreshToken(rawRefreshToken);
			if (payload.sub !== userId) return;
			await this.prisma.refreshToken.updateMany({
				where: { id: payload.jti, userId, revokedAt: null },
				data: { revokedAt: new Date() },
			});
		} catch {
			// Ignore invalid token on logout
		}
	}

	async handleGitHubCallback(code: string) {
		const ghToken = await exchangeGitHubCode(code);

		// Fetch user profile and primary email in parallel
		const [ghUser, primaryEmail] = await Promise.all([
			fetchGitHubUser(ghToken),
			fetchGitHubPrimaryEmail(ghToken),
		]);

		const email = ghUser.email || primaryEmail;

		// Upsert: find by githubId, then by email, or create new
		let user = await this.prisma.user.findUnique({ where: { githubId: String(ghUser.id) } });
		if (!user && email) {
			user = await this.prisma.user.findUnique({ where: { email } });
		}

		let refreshToken: string;

		if (user) {
			// Update GitHub info and create refresh token in parallel
			const [updatedUser, token] = await Promise.all([
				this.prisma.user.update({
					where: { id: user.id },
					data: {
						githubId: String(ghUser.id),
						githubUsername: ghUser.login,
						avatarUrl: ghUser.avatar_url,
						name: user.name || ghUser.name,
					},
				}),
				this.createRefreshToken(user.id),
			]);
			user = updatedUser;
			refreshToken = token;
		} else {
			user = await this.prisma.user.create({
				data: {
					email,
					githubId: String(ghUser.id),
					githubUsername: ghUser.login,
					name: ghUser.name,
					avatarUrl: ghUser.avatar_url,
				},
			});
			// First project + refresh token are independent — run in parallel
			const [, token] = await Promise.all([
				this.prisma.project.create({ data: { userId: user.id, name: 'My First Project' } }),
				this.createRefreshToken(user.id),
			]);
			refreshToken = token;
		}

		return { accessToken: signAccessToken(user.id), refreshToken };
	}
}
