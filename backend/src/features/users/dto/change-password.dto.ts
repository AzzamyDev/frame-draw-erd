import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class ChangePasswordDto extends createZodDto(
	z.object({
		currentPassword: z.string().min(1),
		newPassword: z.string().min(8, 'Password must be at least 8 characters'),
	}),
) {}
