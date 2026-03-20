import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class UpdatePreferencesDto extends createZodDto(
	z.object({
		darkMode: z.boolean().optional(),
	}),
) {}
