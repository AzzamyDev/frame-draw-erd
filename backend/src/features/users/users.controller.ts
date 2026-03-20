import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

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

	@Put('profile')
	updateProfile(@CurrentUser() userId: string, @Body() dto: UpdateProfileDto) {
		return this.usersService.updateProfile(userId, dto);
	}

	@Put('password')
	changePassword(@CurrentUser() userId: string, @Body() dto: ChangePasswordDto) {
		return this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
	}

	@Delete('me')
	deleteAccount(@CurrentUser() userId: string, @Body() dto: DeleteAccountDto) {
		return this.usersService.deleteAccount(userId, dto.password);
	}
}
