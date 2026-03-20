import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
	constructor() {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL is not set');
		super({
			adapter: new PrismaPg({ connectionString: url }),
		});
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}
}
