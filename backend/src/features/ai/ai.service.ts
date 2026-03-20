import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SYSTEM_PROMPT = `You are a DBML schema generator. Output ONLY raw DBML source code.

Hard rules:
- Do NOT use markdown. No triple backticks, no \`\`\`dbml, no language tags, no fences of any kind.
- Do not add a title, preamble, or closing note. The first printable content must be valid DBML (e.g. Table, Enum, Ref, Project).

Use the full DBML spec: Table blocks with typed fields, pk, not null, unique, default, increment annotations, Enum blocks, Ref with cardinality (>, <, -, <>), ref names.

Do NOT add a file-level \`Indexes { ... }\` block (only dbdiagram.io accepts that). If you need indexes, use an \`Indexes { }\` section inside each \`Table\` body only, or omit indexes entirely.`;

/** Removes leading/trailing markdown fences models still emit despite instructions. */
function stripDbmlFences(text: string): string {
	let s = text.trim();
	s = s.replace(/^```(?:\s*[\w-]+)?\s*\r?\n?/, '');
	s = s.replace(/\r?\n?```\s*$/u, '');
	return s.trim();
}

@Injectable()
export class AiService {
	constructor(private readonly config: ConfigService) {}

	async generateDbml(prompt: string): Promise<{ dbml: string }> {
		const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
		if (!apiKey) {
			throw new ServiceUnavailableException('ANTHROPIC_API_KEY is not configured');
		}

		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				model: 'claude-sonnet-4-20250514',
				max_tokens: 2000,
				system: SYSTEM_PROMPT,
				messages: [{ role: 'user', content: prompt }],
			}),
		});

		if (!res.ok) {
			const err = (await res.json().catch(() => ({}))) as {
				error?: { message?: string };
			};
			const msg = err.error?.message || `Anthropic API error: ${res.status}`;
			throw new ServiceUnavailableException(msg);
		}

		const data = (await res.json()) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const raw = data.content?.[0]?.text ?? '';
		const dbml = stripDbmlFences(raw);
		if (!dbml) {
			throw new ServiceUnavailableException('Empty response from Claude');
		}
		return { dbml };
	}
}
