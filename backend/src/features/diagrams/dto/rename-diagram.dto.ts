import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class RenameDiagramDto extends createZodDto(
	z.object({
		name: z.string().min(1, 'Name is required'),
	}),
) {}
