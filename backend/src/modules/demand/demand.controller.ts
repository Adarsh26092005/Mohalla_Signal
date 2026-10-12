import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DemandService } from './demand.service';
import { CreateMissedDemandDto } from './dto/create-missed-demand.dto';
import { ConfirmMissedDemandDto } from './dto/confirm-missed-demand.dto';
import { GetMyDemandQueryDto } from './dto/get-my-demand-query.dto';
import { GetDemandSignalsQueryDto } from './dto/get-demand-signals-query.dto';
import { AssignNeighborhoodDto } from './dto/assign-neighborhood.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Role } from '@prisma/client';

@ApiTags('Demand')
@Controller('demand')
export class DemandController {
  constructor(private readonly demandService: DemandService) {}

  @Post('missed')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth('Firebase-JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Capture a missed customer demand request (Merchant only)',
    description:
      'Records an unfulfilled product request from a customer at the merchant shop. ' +
      'Invokes deterministic matching: stores immediately if MATCHED, returns candidate list if NEEDS_CONFIRMATION, or flags NO_MATCH.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demand captured or confirmation required',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Invalid query or unassigned merchant neighborhood',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Missing or invalid Firebase ID token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires MERCHANT role',
  })
  async recordMissedDemand(
    @CurrentUser() user: User,
    @Body() dto: CreateMissedDemandDto,
  ) {
    return this.demandService.recordMissedDemand(user, dto);
  }

  @Post('missed/confirm')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth('Firebase-JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm canonical product for an ambiguous demand request (Merchant only)',
    description:
      'When an initial request returned NEEDS_CONFIRMATION, the merchant uses this endpoint to explicitly select and persist the canonical product.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demand confirmed and recorded successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires MERCHANT role',
  })
  async confirmMissedDemand(
    @CurrentUser() user: User,
    @Body() dto: ConfirmMissedDemandDto,
  ) {
    return this.demandService.confirmMissedDemand(user, dto);
  }

  @Get('missed/mine')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth('Firebase-JWT')
  @ApiOperation({
    summary: "Retrieve authenticated merchant's own captured demand history",
    description:
      "Returns paginated history of missed demand records captured exclusively by the authenticated merchant's shop (Zero IDOR / cross-merchant exposure).",
  })
  @ApiResponse({
    status: 200,
    description: "List of authenticated merchant's captured demands",
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires MERCHANT role',
  })
  async getMyDemands(
    @CurrentUser() user: User,
    @Query() query: GetMyDemandQueryDto,
  ) {
    return this.demandService.getMyDemands(user, query);
  }

  @Get('signals')
  @ApiOperation({
    summary: 'Get privacy-thresholded neighborhood demand signals',
    description:
      'Public intelligence feed returning aggregated demand signals for canonical products across neighborhoods. ' +
      'Strict privacy threshold enforced (default: ≥ 3 distinct merchants). ' +
      'Signals below threshold are completely omitted. Output contains zero merchant identities, shop names, or individual counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of qualified neighborhood demand signals meeting the privacy threshold',
  })
  async getNeighborhoodSignals(@Query() query: GetDemandSignalsQueryDto) {
    return this.demandService.getNeighborhoodSignals(query);
  }

  @Patch('merchants/:merchantId/neighborhood')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('Firebase-JWT')
  @ApiOperation({
    summary: 'Assign a merchant to a neighborhood (Admin only)',
    description:
      'Administrative endpoint to associate a verified merchant shop with a specific neighborhood cluster.',
  })
  @ApiParam({
    name: 'merchantId',
    description: 'MerchantProfile UUID',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant successfully assigned to neighborhood',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMIN role',
  })
  async assignMerchantNeighborhood(
    @Param('merchantId') merchantId: string,
    @Body() dto: AssignNeighborhoodDto,
  ) {
    return this.demandService.assignMerchantNeighborhood(
      merchantId,
      dto.neighborhoodId,
    );
  }
}
