import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../config/prisma/prisma.service';

const prismaMock = {
	project: {
		findMany: jest.fn(),
		findFirst: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
};

const NOW = new Date();

const MOCK_PROJECT = {
	id: 'proj-1',
	userId: 'user-1',
	name: 'My Project',
	description: null,
	createdAt: NOW,
	updatedAt: NOW,
	diagrams: [],
	_count: { diagrams: 0 },
};

describe('ProjectsService', () => {
	let service: ProjectsService;

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [ProjectsService, { provide: PrismaService, useValue: prismaMock }],
		}).compile();

		service = module.get(ProjectsService);
	});

	// ── findAll ──────────────────────────────────────────────────────────────────
	describe('findAll', () => {
		it('returns mapped project list', async () => {
			prismaMock.project.findMany.mockResolvedValue([MOCK_PROJECT]);

			const result = await service.findAll('user-1');

			expect(result.projects).toHaveLength(1);
			expect(result.projects[0].id).toBe('proj-1');
			expect(result.projects[0].diagramCount).toBe(0);
		});

		it('returns empty list when user has no projects', async () => {
			prismaMock.project.findMany.mockResolvedValue([]);
			const result = await service.findAll('user-1');
			expect(result.projects).toHaveLength(0);
		});
	});

	// ── findOne ──────────────────────────────────────────────────────────────────
	describe('findOne', () => {
		it('returns project with diagrams', async () => {
			prismaMock.project.findFirst.mockResolvedValue(MOCK_PROJECT);
			const result = await service.findOne('user-1', 'proj-1');
			expect(result.id).toBe('proj-1');
		});

		it('throws NotFoundException when project not found', async () => {
			prismaMock.project.findFirst.mockResolvedValue(null);
			await expect(service.findOne('user-1', 'proj-x')).rejects.toThrow(NotFoundException);
		});
	});

	// ── create ───────────────────────────────────────────────────────────────────
	describe('create', () => {
		it('creates and returns new project', async () => {
			prismaMock.project.create.mockResolvedValue(MOCK_PROJECT);
			const result = await service.create('user-1', { name: 'My Project' });
			expect(result.id).toBe('proj-1');
			expect(prismaMock.project.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ name: 'My Project', userId: 'user-1' }),
				}),
			);
		});
	});

	// ── rename ───────────────────────────────────────────────────────────────────
	describe('rename', () => {
		it('renames project when user owns it', async () => {
			prismaMock.project.findFirst.mockResolvedValue(MOCK_PROJECT);
			prismaMock.project.update.mockResolvedValue({
				id: 'proj-1',
				name: 'New Name',
				updatedAt: NOW,
			});

			const result = await service.rename('user-1', 'proj-1', 'New Name');

			expect(result.name).toBe('New Name');
			expect(prismaMock.project.update).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: 'proj-1' }, data: { name: 'New Name' } }),
			);
		});

		it('throws NotFoundException when project does not belong to user', async () => {
			prismaMock.project.findFirst.mockResolvedValue(null);
			await expect(service.rename('user-1', 'proj-x', 'X')).rejects.toThrow(NotFoundException);
			expect(prismaMock.project.update).not.toHaveBeenCalled();
		});
	});

	// ── remove ───────────────────────────────────────────────────────────────────
	describe('remove', () => {
		it('deletes project when user owns it', async () => {
			prismaMock.project.findFirst.mockResolvedValue(MOCK_PROJECT);
			prismaMock.project.delete.mockResolvedValue({});

			await service.remove('user-1', 'proj-1');

			expect(prismaMock.project.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
		});

		it('throws NotFoundException and does not delete when project not owned', async () => {
			prismaMock.project.findFirst.mockResolvedValue(null);
			await expect(service.remove('user-1', 'proj-x')).rejects.toThrow(NotFoundException);
			expect(prismaMock.project.delete).not.toHaveBeenCalled();
		});
	});
});
