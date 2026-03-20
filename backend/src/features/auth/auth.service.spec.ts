import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import * as hashLib from '../../helpers/hash';
import * as jwtLib from '../../helpers/jwt';
import * as githubLib from '../../helpers/github';

// ── Prisma mock ────────────────────────────────────────────────────────────────
const prismaMock = {
	user: {
		findUnique: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
	},
	project: {
		create: jest.fn(),
	},
	refreshToken: {
		create: jest.fn(),
		findUnique: jest.fn(),
		update: jest.fn(),
		updateMany: jest.fn(),
	},
};

// ── Fixtures ───────────────────────────────────────────────────────────────────
const MOCK_USER = {
	id: 'user-1',
	email: 'test@example.com',
	passwordHash: 'hashed',
	name: 'Test User',
	avatarUrl: null,
	githubUsername: null,
	githubId: null,
	darkMode: false,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const MOCK_TOKEN_RECORD = {
	id: 'token-rec-1',
	token: 'raw',
	userId: 'user-1',
	expiresAt: new Date(Date.now() + 86400_000),
	revokedAt: null,
	createdAt: new Date(),
};

describe('AuthService', () => {
	let service: AuthService;

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [AuthService, { provide: PrismaService, useValue: prismaMock }],
		}).compile();

		service = module.get(AuthService);

		// Default happy-path stubs
		prismaMock.refreshToken.create.mockResolvedValue(MOCK_TOKEN_RECORD);
		prismaMock.project.create.mockResolvedValue({ id: 'proj-1' });
	});

	// ── register ────────────────────────────────────────────────────────────────
	describe('register', () => {
		it('creates user, project and returns tokens', async () => {
			prismaMock.user.findUnique.mockResolvedValue(null);
			prismaMock.user.create.mockResolvedValue(MOCK_USER);
			jest.spyOn(hashLib, 'hashPassword').mockResolvedValue('hashed');

			const result = await service.register({
				email: 'test@example.com',
				password: 'pass',
				name: 'Test User',
			});

			expect(result.user.email).toBe('test@example.com');
			expect(result.accessToken).toBeTruthy();
			expect(result.refreshToken).toBeTruthy();
			expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
		});

		it('throws ConflictException when email already exists', async () => {
			prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);

			await expect(
				service.register({ email: 'test@example.com', password: 'pass', name: 'X' }),
			).rejects.toThrow(ConflictException);

			expect(prismaMock.user.create).not.toHaveBeenCalled();
		});
	});

	// ── login ───────────────────────────────────────────────────────────────────
	describe('login', () => {
		it('returns tokens for valid credentials', async () => {
			prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);
			jest.spyOn(hashLib, 'verifyPassword').mockResolvedValue(true);

			const result = await service.login({
				email: 'test@example.com',
				password: 'pass',
			});

			expect(result.user.id).toBe('user-1');
			expect(result.accessToken).toBeTruthy();
			expect(result.refreshToken).toBeTruthy();
		});

		it('throws UnauthorizedException when user not found', async () => {
			prismaMock.user.findUnique.mockResolvedValue(null);

			await expect(
				service.login({ email: 'nobody@example.com', password: 'x' }),
			).rejects.toThrow(UnauthorizedException);
		});

		it('throws UnauthorizedException when user has no passwordHash (OAuth user)', async () => {
			prismaMock.user.findUnique.mockResolvedValue({ ...MOCK_USER, passwordHash: null });

			await expect(service.login({ email: 'test@example.com', password: 'x' })).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it('throws UnauthorizedException for wrong password', async () => {
			prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);
			jest.spyOn(hashLib, 'verifyPassword').mockResolvedValue(false);

			await expect(
				service.login({ email: 'test@example.com', password: 'wrong' }),
			).rejects.toThrow(UnauthorizedException);
		});
	});

	// ── refresh ─────────────────────────────────────────────────────────────────
	describe('refresh', () => {
		it('issues new token pair and revokes old one', async () => {
			const oldToken = jwtLib.signRefreshToken('user-1', 'token-rec-1');
			prismaMock.refreshToken.findUnique.mockResolvedValue(MOCK_TOKEN_RECORD);
			prismaMock.refreshToken.update.mockResolvedValue({});

			const result = await service.refresh(oldToken);

			expect(result.accessToken).toBeTruthy();
			expect(result.refreshToken).toBeTruthy();
			expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: 'token-rec-1' } }),
			);
		});

		it('throws for invalid JWT', async () => {
			await expect(service.refresh('not-a-jwt')).rejects.toThrow(UnauthorizedException);
		});

		it('throws and revokes all tokens when record is already revoked (reuse attack)', async () => {
			const token = jwtLib.signRefreshToken('user-1', 'token-rec-1');
			prismaMock.refreshToken.findUnique.mockResolvedValue({
				...MOCK_TOKEN_RECORD,
				revokedAt: new Date(),
			});
			prismaMock.refreshToken.updateMany.mockResolvedValue({});

			await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
			expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
			);
		});

		it('throws when token record is expired', async () => {
			const token = jwtLib.signRefreshToken('user-1', 'token-rec-1');
			prismaMock.refreshToken.findUnique.mockResolvedValue({
				...MOCK_TOKEN_RECORD,
				expiresAt: new Date(Date.now() - 1000),
			});

			await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
		});

		it('throws when userId does not match JWT sub', async () => {
			const token = jwtLib.signRefreshToken('user-1', 'token-rec-1');
			prismaMock.refreshToken.findUnique.mockResolvedValue({
				...MOCK_TOKEN_RECORD,
				userId: 'user-DIFFERENT',
			});

			await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
		});
	});

	// ── logout ──────────────────────────────────────────────────────────────────
	describe('logout', () => {
		it('revokes the matching refresh token', async () => {
			const token = jwtLib.signRefreshToken('user-1', 'token-rec-1');
			prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

			await service.logout('user-1', token);

			expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ id: 'token-rec-1', userId: 'user-1' }),
				}),
			);
		});

		it('silently ignores invalid token', async () => {
			await expect(service.logout('user-1', 'garbage')).resolves.toBeUndefined();
			expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
		});

		it('silently ignores token belonging to a different user', async () => {
			const token = jwtLib.signRefreshToken('user-OTHER', 'token-rec-1');
			await service.logout('user-1', token);
			expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
		});
	});

	// ── handleGitHubCallback ────────────────────────────────────────────────────
	describe('handleGitHubCallback', () => {
		const ghUser = {
			id: 42,
			login: 'johndoe',
			name: 'John Doe',
			avatar_url: 'https://avatars.github.com/u/42',
			email: 'john@github.com',
		};

		beforeEach(() => {
			jest.spyOn(githubLib, 'exchangeGitHubCode').mockResolvedValue('gh-token');
			jest.spyOn(githubLib, 'fetchGitHubUser').mockResolvedValue(ghUser);
			jest.spyOn(githubLib, 'fetchGitHubPrimaryEmail').mockResolvedValue('john@github.com');
		});

		it('creates new user and project on first OAuth login', async () => {
			prismaMock.user.findUnique.mockResolvedValue(null);
			prismaMock.user.create.mockResolvedValue({ ...MOCK_USER, githubId: '42' });

			const result = await service.handleGitHubCallback('code-123');

			expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
			expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
			expect(result.accessToken).toBeTruthy();
			expect(result.refreshToken).toBeTruthy();
		});

		it('updates existing user on subsequent OAuth login', async () => {
			const existingUser = { ...MOCK_USER, githubId: '42' };
			prismaMock.user.findUnique.mockResolvedValue(existingUser);
			prismaMock.user.update.mockResolvedValue(existingUser);

			const result = await service.handleGitHubCallback('code-456');

			expect(prismaMock.user.create).not.toHaveBeenCalled();
			expect(prismaMock.user.update).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: 'user-1' } }),
			);
			expect(result.accessToken).toBeTruthy();
		});
	});
});
