import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiagramsService } from './diagrams.service';
import { PrismaService } from '../../config/prisma/prisma.service';

const prismaMock = {
	project: { findFirst: jest.fn() },
	diagram: {
		findMany: jest.fn(),
		findFirst: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	},
};

const NOW = new Date();

const MOCK_DIAGRAM = {
	id: 'diag-1',
	projectId: 'proj-1',
	name: 'My Diagram',
	dbmlCode: 'Table users {}',
	nodeColors: {},
	nodes: [],
	edges: [],
	showFieldTypes: true,
	showMinimap: true,
	showEnums: true,
	showEdgeAnimation: false,
	createdAt: NOW,
	updatedAt: NOW,
};

describe('DiagramsService', () => {
	let service: DiagramsService;

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			providers: [DiagramsService, { provide: PrismaService, useValue: prismaMock }],
		}).compile();

		service = module.get(DiagramsService);
	});

	// ── findAll ──────────────────────────────────────────────────────────────────
	describe('findAll', () => {
		it('returns diagrams for owned project', async () => {
			prismaMock.diagram.findMany.mockResolvedValue([
				{ id: 'diag-1', name: 'My Diagram', createdAt: NOW, updatedAt: NOW },
			]);

			const result = await service.findAll('user-1', 'proj-1');

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('diag-1');
		});

		it('returns empty list when project has no diagrams', async () => {
			prismaMock.diagram.findMany.mockResolvedValue([]);
			const result = await service.findAll('user-1', 'proj-1');
			expect(result).toHaveLength(0);
		});
	});

	// ── findOne ──────────────────────────────────────────────────────────────────
	describe('findOne', () => {
		it('returns diagram when ownership is valid', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(MOCK_DIAGRAM);
			const result = await service.findOne('user-1', 'proj-1', 'diag-1');
			expect(result.id).toBe('diag-1');
		});

		it('throws NotFoundException when diagram not found or wrong owner', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(null);
			await expect(service.findOne('user-1', 'proj-1', 'diag-x')).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	// ── create ───────────────────────────────────────────────────────────────────
	describe('create', () => {
		it('creates diagram when project is owned', async () => {
			prismaMock.project.findFirst.mockResolvedValue({ id: 'proj-1', userId: 'user-1' });
			prismaMock.diagram.create.mockResolvedValue(MOCK_DIAGRAM);

			const result = await service.create('user-1', 'proj-1', {
				name: 'My Diagram',
				dbmlCode: 'Table users {}',
			});

			expect(result.id).toBe('diag-1');
			expect(prismaMock.diagram.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ name: 'My Diagram', dbmlCode: 'Table users {}' }),
				}),
			);
		});

		it('defaults dbmlCode to empty string when not provided', async () => {
			prismaMock.project.findFirst.mockResolvedValue({ id: 'proj-1', userId: 'user-1' });
			prismaMock.diagram.create.mockResolvedValue(MOCK_DIAGRAM);

			await service.create('user-1', 'proj-1', { name: 'Empty' });

			expect(prismaMock.diagram.create).toHaveBeenCalledWith(
				expect.objectContaining({ data: expect.objectContaining({ dbmlCode: '' }) }),
			);
		});

		it('throws NotFoundException when project not found', async () => {
			prismaMock.project.findFirst.mockResolvedValue(null);
			await expect(service.create('user-1', 'proj-x', { name: 'X' })).rejects.toThrow(
				NotFoundException,
			);
			expect(prismaMock.diagram.create).not.toHaveBeenCalled();
		});
	});

	// ── update ───────────────────────────────────────────────────────────────────
	describe('update', () => {
		it('updates only provided fields', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(MOCK_DIAGRAM);
			prismaMock.diagram.update.mockResolvedValue({
				...MOCK_DIAGRAM,
				dbmlCode: 'Table orders {}',
			});

			const result = await service.update('user-1', 'proj-1', 'diag-1', {
				dbmlCode: 'Table orders {}',
			});

			expect(prismaMock.diagram.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: { dbmlCode: 'Table orders {}' } }),
			);
			expect(result.dbmlCode).toBe('Table orders {}');
		});

		it('ignores undefined fields in the update payload', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(MOCK_DIAGRAM);
			prismaMock.diagram.update.mockResolvedValue(MOCK_DIAGRAM);

			await service.update('user-1', 'proj-1', 'diag-1', {
				dbmlCode: 'new',
				showMinimap: undefined,
			});

			const callData = prismaMock.diagram.update.mock.calls[0][0].data;
			expect(callData).not.toHaveProperty('showMinimap');
			expect(callData).toHaveProperty('dbmlCode', 'new');
		});

		it('throws NotFoundException when diagram not found', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(null);
			await expect(
				service.update('user-1', 'proj-1', 'diag-x', { dbmlCode: 'x' }),
			).rejects.toThrow(NotFoundException);
		});
	});

	// ── rename ───────────────────────────────────────────────────────────────────
	describe('rename', () => {
		it('renames the diagram', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(MOCK_DIAGRAM);
			prismaMock.diagram.update.mockResolvedValue({
				id: 'diag-1',
				name: 'Renamed',
				updatedAt: NOW,
			});

			const result = await service.rename('user-1', 'proj-1', 'diag-1', 'Renamed');

			expect(result.name).toBe('Renamed');
			expect(prismaMock.diagram.update).toHaveBeenCalledWith(
				expect.objectContaining({ data: { name: 'Renamed' } }),
			);
		});

		it('throws NotFoundException when diagram not found', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(null);
			await expect(service.rename('user-1', 'proj-1', 'diag-x', 'X')).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	// ── remove ───────────────────────────────────────────────────────────────────
	describe('remove', () => {
		it('deletes diagram when ownership is valid', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(MOCK_DIAGRAM);
			prismaMock.diagram.delete.mockResolvedValue({});

			await service.remove('user-1', 'proj-1', 'diag-1');

			expect(prismaMock.diagram.delete).toHaveBeenCalledWith({ where: { id: 'diag-1' } });
		});

		it('throws NotFoundException without deleting when diagram not found', async () => {
			prismaMock.diagram.findFirst.mockResolvedValue(null);
			await expect(service.remove('user-1', 'proj-1', 'diag-x')).rejects.toThrow(
				NotFoundException,
			);
			expect(prismaMock.diagram.delete).not.toHaveBeenCalled();
		});
	});
});
