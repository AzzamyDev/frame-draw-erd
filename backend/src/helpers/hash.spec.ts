import { hashPassword, verifyPassword, sha256 } from './hash';

describe('hash helpers', () => {
	describe('hashPassword / verifyPassword', () => {
		it('hashes a password and verifies it correctly', async () => {
			const hash = await hashPassword('secret123');
			expect(hash).not.toBe('secret123');
			await expect(verifyPassword('secret123', hash)).resolves.toBe(true);
		});

		it('returns false for wrong password', async () => {
			const hash = await hashPassword('correct');
			await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
		});

		it('produces different hashes for the same input (salt)', async () => {
			const a = await hashPassword('same');
			const b = await hashPassword('same');
			expect(a).not.toBe(b);
		});
	});

	describe('sha256', () => {
		it('returns a 64-char hex string', () => {
			const result = sha256('hello');
			expect(result).toHaveLength(64);
			expect(result).toMatch(/^[0-9a-f]+$/);
		});

		it('is deterministic', () => {
			expect(sha256('test')).toBe(sha256('test'));
		});

		it('different inputs produce different hashes', () => {
			expect(sha256('a')).not.toBe(sha256('b'));
		});
	});
});
