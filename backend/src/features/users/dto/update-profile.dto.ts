import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class UpdateProfileDto extends createZodDto(
	z.object({
		name: z.string().min(1).max(100).optional(),
		email: z.string().email().optional(),
	}),
) {}
