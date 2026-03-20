import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateDiagramDto extends createZodDto(
	z.object({
		name: z.string().min(1).default('Untitled Diagram'),
		dbmlCode: z.string().optional(),
	}),
) {}
