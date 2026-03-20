import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class UpdateDiagramDto extends createZodDto(
	z.object({
		dbmlCode: z.string().optional(),
		nodeColors: z.record(z.string(), z.string()).optional(),
		nodes: z.array(z.any()).optional(),
		edges: z.array(z.any()).optional(),
		showFieldTypes: z.boolean().optional(),
		showMinimap: z.boolean().optional(),
		showEnums: z.boolean().optional(),
		showEdgeAnimation: z.boolean().optional(),
	}),
) {}
