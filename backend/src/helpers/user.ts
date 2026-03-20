import { User } from '@prisma/generated/client';

export function formatUser(user: User) {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		avatarUrl: user.avatarUrl,
		githubUsername: user.githubUsername,
		darkMode: user.darkMode,
		hasPassword: !!user.passwordHash,
		createdAt: user.createdAt,
	};
}
