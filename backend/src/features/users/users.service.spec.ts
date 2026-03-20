import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../config/prisma/prisma.service';

const prismaMock = {
	user: {
		findUnique: jest.fn(),
		update: jest.fn(),
	},
};

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

describe('UsersService', () => {
	let service: UsersService;

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [UsersService, { provide: PrismaService, useValue: prismaMock }],
		}).compile();

		service = module.get(UsersService);
	});

	// ── findMe ───────────────────────────────────────────────────────────────────
	describe('findMe', () => {
		it('returns formatted user for valid userId', async () => {
			prismaMock.user.findUnique.mockResolvedValue(MOCK_USER);

			const result = await service.findMe('user-1');

			expect(result.id).toBe('user-1');
			expect(result.email).toBe('test@example.com');
			// passwordHash must not be exposed
			expect(result).not.toHaveProperty('passwordHash');
		});

		it('throws NotFoundException when user does not exist', async () => {
			prismaMock.user.findUnique.mockResolvedValue(null);
			await expect(service.findMe('user-x')).rejects.toThrow(NotFoundException);
		});
	});

	// ── updatePreferences ────────────────────────────────────────────────────────
	describe('updatePreferences', () => {
		it('updates darkMode and returns new value', async () => {
			prismaMock.user.update.mockResolvedValue({ darkMode: true });

			const result = await service.updatePreferences('user-1', { darkMode: true });

			expect(result.darkMode).toBe(true);
			expect(prismaMock.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 'user-1' },
					data: { darkMode: true },
				}),
			);
		});

		it('accepts empty preferences without throwing', async () => {
			prismaMock.user.update.mockResolvedValue({ darkMode: false });
			await expect(service.updatePreferences('user-1', {})).resolves.toBeDefined();
		});
	});
});
