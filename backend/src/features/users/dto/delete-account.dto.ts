import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class DeleteAccountDto extends createZodDto(
	z.object({
		// required only when account has a password; GitHub-only users omit this
		password: z.string().optional(),
	}),
) {}
