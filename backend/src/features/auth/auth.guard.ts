import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken } from '../../helpers/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest();
		const auth: string = req.headers['authorization'] || '';
		if (!auth.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing authorization header');
		}
		const token = auth.slice(7);
		try {
			const payload = verifyAccessToken(token);
			req.userId = payload.sub;
			return true;
		} catch {
			throw new UnauthorizedException('Token expired or invalid');
		}
	}
}
