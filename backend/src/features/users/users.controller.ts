import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
	constructor(private usersService: UsersService) {}

	@Get('me')
	me(@CurrentUser() userId: string) {
		return this.usersService.findMe(userId);
	}

	@Put('preferences')
	updatePreferences(@CurrentUser() userId: string, @Body() dto: UpdatePreferencesDto) {
		return this.usersService.updatePreferences(userId, dto);
	}
}
