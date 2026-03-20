import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class RegisterDto extends createZodDto(
	z.object({
		email: z.string().email(),
		password: z.string().min(8, 'Password must be at least 8 characters'),
		name: z.string().optional(),
	}),
) {}
