import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AiService } from './ai.service';
import { GenerateDbmlDto } from './dto/generate-dbml.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
	constructor(private readonly aiService: AiService) {}

	@Post('dbml')
	@HttpCode(200)
	generate(@Body() dto: GenerateDbmlDto) {
		return this.aiService.generateDbml(dto.prompt);
	}
}
