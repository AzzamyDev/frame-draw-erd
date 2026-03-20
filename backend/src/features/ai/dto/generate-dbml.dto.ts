import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class GenerateDbmlDto extends createZodDto(
	z.object({
		prompt: z.string().min(1).max(16_000),
	}),
) {}
