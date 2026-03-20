import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
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
}
