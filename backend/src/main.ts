import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bufferLogs: true });

	app.setGlobalPrefix('api');
	app.useGlobalPipes(new ZodValidationPipe());
	app.use(cookieParser());
	app.enableCors({
		origin: process.env.FRONTEND_URL || 'http://localhost:5173',
		credentials: true,
		allowedHeaders: ['Authorization', 'Content-Type'],
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	});

	const port = process.env.PORT || 3001;
	await app.listen(port);
	Logger.log(`Backend running on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
