import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class RenameProjectDto extends createZodDto(
	z.object({
		name: z.string().min(1, 'Name is required'),
	}),
) {}
