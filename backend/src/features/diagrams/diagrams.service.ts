import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';

@Injectable()
export class DiagramsService {
	constructor(private prisma: PrismaService) {}

	/** Single query: verifies project ownership + diagram existence at once */
	private async findDiagram(userId: string, projectId: string, diagramId: string) {
		const diagram = await this.prisma.diagram.findFirst({
			where: { id: diagramId, projectId, project: { userId } },
		});
		if (!diagram) throw new NotFoundException('Diagram not found');
		return diagram;
	}

	async findAll(userId: string, projectId: string) {
		const diagrams = await this.prisma.diagram.findMany({
			where: { projectId, project: { userId } },
			orderBy: { updatedAt: 'desc' },
			select: { id: true, name: true, createdAt: true, updatedAt: true },
		});
		return { diagrams };
	}

	async findOne(userId: string, projectId: string, diagramId: string) {
		return this.findDiagram(userId, projectId, diagramId);
	}

	async create(userId: string, projectId: string, dto: CreateDiagramDto) {
		const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
		if (!project) throw new NotFoundException('Project not found');

		return this.prisma.diagram.create({
			data: { projectId, name: dto.name, dbmlCode: dto.dbmlCode ?? '' },
		});
	}

	async update(userId: string, projectId: string, diagramId: string, dto: UpdateDiagramDto) {
		await this.findDiagram(userId, projectId, diagramId);

		// Build update payload — only include fields that were explicitly provided
		const data = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));

		return this.prisma.diagram.update({ where: { id: diagramId }, data });
	}

	async rename(userId: string, projectId: string, diagramId: string, name: string) {
		await this.findDiagram(userId, projectId, diagramId);
		return this.prisma.diagram.update({
			where: { id: diagramId },
			data: { name },
			select: { id: true, name: true, updatedAt: true },
		});
	}

	async remove(userId: string, projectId: string, diagramId: string) {
		await this.findDiagram(userId, projectId, diagramId);
		await this.prisma.diagram.delete({ where: { id: diagramId } });
	}
}
