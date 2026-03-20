import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './config/prisma/prisma.module';
import { AuthModule } from './features/auth/auth.module';
import { ProjectsModule } from './features/projects/projects.module';
import { DiagramsModule } from './features/diagrams/diagrams.module';
import { UsersModule } from './features/users/users.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, cache: true }),
		PrismaModule,
		AuthModule,
		ProjectsModule,
		DiagramsModule,
		UsersModule,
	],
})
export class AppModule {}
