import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
	constructor(private prisma: PrismaService) {}

	async findAll(userId: string) {
		const projects = await this.prisma.project.findMany({
			where: { userId },
			orderBy: { updatedAt: 'desc' },
			include: {
				_count: { select: { diagrams: true } },
			},
		});
		return projects.map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description,
			diagramCount: p._count.diagrams,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
		}));
	}

	async findOne(userId: string, projectId: string) {
		const project = await this.prisma.project.findFirst({
			where: { id: projectId, userId },
			include: {
				diagrams: {
					orderBy: { updatedAt: 'desc' },
					select: { id: true, name: true, createdAt: true, updatedAt: true },
				},
			},
		});
		if (!project) throw new NotFoundException('Project not found');
		return project;
	}

	async create(userId: string, dto: CreateProjectDto) {
		return this.prisma.project.create({
			data: {
				userId,
				name: dto.name,
				description: dto.description,
			},
		});
	}

	async rename(userId: string, projectId: string, name: string) {
		await this.ensureOwnership(userId, projectId);
		return this.prisma.project.update({
			where: { id: projectId },
			data: { name },
			select: { id: true, name: true, updatedAt: true },
		});
	}

	async remove(userId: string, projectId: string) {
		await this.ensureOwnership(userId, projectId);
		await this.prisma.project.delete({ where: { id: projectId } });
	}

	async ensureOwnership(userId: string, projectId: string) {
		const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
		if (!project) throw new NotFoundException('Project not found');
		return project;
	}
}
