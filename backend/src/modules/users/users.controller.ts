import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { OnboardUserDto } from './dto/onboard-user.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('Firebase-JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description:
      'Verifies the Firebase ID token and returns the corresponding Mohalla Signal application user and role-specific profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Safe user information and profile details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Missing, invalid, or expired Firebase ID token',
  })
  async getMe(@CurrentUser() user: User) {
    return this.usersService.getMe(user.id);
  }

  @Post('onboard')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Onboard or select application role and update profile',
    description:
      'Allows an authenticated user to complete onboarding as a CUSTOMER, MERCHANT, or SUPPLIER. Note: ADMIN role cannot be self-assigned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated and onboarding completed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Invalid role data or validation failure',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Missing or invalid Firebase ID token',
  })
  async onboard(@CurrentUser() user: User, @Body() dto: OnboardUserDto) {
    return this.usersService.onboard(user.id, dto);
  }
}
