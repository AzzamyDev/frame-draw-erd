import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateProjectDto extends createZodDto(
	z.object({
		name: z.string().min(1).default('Untitled Project'),
		description: z.string().optional(),
	}),
) {}
