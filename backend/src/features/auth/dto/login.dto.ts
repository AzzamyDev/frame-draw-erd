import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class LoginDto extends createZodDto(
	z.object({
		email: z.string().email(),
		password: z.string().min(1),
	}),
) {}
