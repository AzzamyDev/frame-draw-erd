import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class RefreshDto extends createZodDto(
	z.object({
		refreshToken: z.string().min(1),
	}),
) {}
