import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DiagramsService } from './diagrams.service';
import { CreateDiagramDto } from './dto/create-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';
import { RenameDiagramDto } from './dto/rename-diagram.dto';

@Controller('projects/:projectId/diagrams')
@UseGuards(JwtAuthGuard)
export class DiagramsController {
	constructor(private diagramsService: DiagramsService) {}

	@Get()
	findAll(@CurrentUser() userId: string, @Param('projectId') projectId: string) {
		return this.diagramsService.findAll(userId, projectId);
	}

	@Get(':id')
	findOne(
		@CurrentUser() userId: string,
		@Param('projectId') projectId: string,
		@Param('id') id: string,
	) {
		return this.diagramsService.findOne(userId, projectId, id);
	}

	@Post()
	create(
		@CurrentUser() userId: string,
		@Param('projectId') projectId: string,
		@Body() dto: CreateDiagramDto,
	) {
		return this.diagramsService.create(userId, projectId, dto);
	}

	@Put(':id')
	update(
		@CurrentUser() userId: string,
		@Param('projectId') projectId: string,
		@Param('id') id: string,
		@Body() dto: UpdateDiagramDto,
	) {
		return this.diagramsService.update(userId, projectId, id, dto);
	}

	@Patch(':id/name')
	rename(
		@CurrentUser() userId: string,
		@Param('projectId') projectId: string,
		@Param('id') id: string,
		@Body() dto: RenameDiagramDto,
	) {
		return this.diagramsService.rename(userId, projectId, id, dto.name);
	}

	@Delete(':id')
	@HttpCode(204)
	remove(
		@CurrentUser() userId: string,
		@Param('projectId') projectId: string,
		@Param('id') id: string,
	) {
		return this.diagramsService.remove(userId, projectId, id);
	}
}
