import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { RenameProjectDto } from './dto/rename-project.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
	constructor(private projectsService: ProjectsService) {}

	@Get()
	findAll(@CurrentUser() userId: string) {
		return this.projectsService.findAll(userId);
	}

	@Get(':id')
	findOne(@CurrentUser() userId: string, @Param('id') id: string) {
		return this.projectsService.findOne(userId, id);
	}

	@Post()
	create(@CurrentUser() userId: string, @Body() dto: CreateProjectDto) {
		return this.projectsService.create(userId, dto);
	}

	@Patch(':id/name')
	rename(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: RenameProjectDto) {
		return this.projectsService.rename(userId, id, dto.name);
	}

	@Delete(':id')
	@HttpCode(204)
	remove(@CurrentUser() userId: string, @Param('id') id: string) {
		return this.projectsService.remove(userId, id);
	}
}
