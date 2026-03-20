import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../helpers/hash';
import { formatUser } from '../../helpers/user';

@Injectable()
export class UsersService {
	constructor(private prisma: PrismaService) {}

	async findMe(userId: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new NotFoundException('User not found');
		return formatUser(user);
	}

	async updatePreferences(userId: string, data: { darkMode?: boolean }) {
		return this.prisma.user.update({
			where: { id: userId },
			data,
			select: { darkMode: true },
		});
	}

	async updateProfile(userId: string, data: { name?: string; email?: string }) {
		if (data.email) {
			const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
			if (existing && existing.id !== userId) throw new ConflictException('Email already in use');
		}
		const user = await this.prisma.user.update({ where: { id: userId }, data });
		return formatUser(user);
	}

	async changePassword(userId: string, currentPassword: string, newPassword: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new NotFoundException('User not found');
		if (!user.passwordHash) throw new BadRequestException('Account uses GitHub login — no password set');

		const valid = await verifyPassword(currentPassword, user.passwordHash);
		if (!valid) throw new ForbiddenException('Current password is incorrect');
		if (currentPassword === newPassword) throw new BadRequestException('New password must differ from current');

		await this.prisma.user.update({
			where: { id: userId },
			data: { passwordHash: await hashPassword(newPassword) },
		});
		return { message: 'Password updated' };
	}

	async deleteAccount(userId: string, password?: string) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new NotFoundException('User not found');

		if (user.passwordHash) {
			if (!password) throw new BadRequestException('Password required to delete account');
			const valid = await verifyPassword(password, user.passwordHash);
			if (!valid) throw new ForbiddenException('Incorrect password');
		}

		// Cascade via Prisma schema: projects → diagrams, refreshTokens
		await this.prisma.user.delete({ where: { id: userId } });
		return { message: 'Account deleted' };
	}
}
