import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { GetMyQuoteRequestsQueryDto } from './dto/get-my-quote-requests-query.dto';
import { GetAvailableQuoteRequestsQueryDto } from './dto/get-available-quote-requests-query.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';
import { RecordPurchaseDecisionDto } from './dto/record-purchase-decision.dto';
import { GetMyQuotesQueryDto } from './dto/get-my-quotes-query.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Role } from '@prisma/client';

@ApiTags('Quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('requests')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth('Firebase-JWT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a supplier quote request from an eligible demand signal (Merchant only)',
    description:
      'Creates a quote request for a canonical product in the merchant’s assigned neighborhood. ' +
      'Strictly verifies server-side that the neighborhood demand signal meets the privacy threshold (≥ 3 distinct merchants). ' +
      'Derives merchant identity server-side. Rejects fabricated or sub-threshold demand signals.',
  })
  @ApiResponse({
    status: 201,
    description: 'Quote request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Sub-threshold signal, wrong neighborhood, or invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires MERCHANT role',
  })
  async createQuoteRequest(@CurrentUser() user: User, @Body() dto: CreateQuoteRequestDto) {
    return this.quotesService.createQuoteRequest(user, dto);
  }

  @Get('requests/mine')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth('Firebase-JWT')
  @ApiOperation({
    summary: 'View own quote requests and received supplier quotes (Merchant only)',
    description:
      'Returns paginated list of quote requests initiated by the authenticated merchant, ' +
      'including any commercial quotes submitted by suppliers.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of quote requests and received quotes',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires MERCHANT role',
  })
  async getMyQuoteRequests(@CurrentUser() user: User, @Query() query: GetMyQuoteRequestsQueryDto) {
    return this.quotesService.getMyQuoteRequests(user, query);
  }

  @Get('requests/available')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER)
  @ApiBearerAuth('Firebase-JWT')
  @ApiOperation({
    summary: 'View available quote requests in service area (Supplier only)',
    description:
      'Returns open quote requests matching the supplier’s verified capability and PIN code service area. ' +
      'Preserves merchant privacy: Zero merchant identities, shop addresses, or private request counts are exposed.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of eligible quote requests available to quote',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires verified SUPPLIER role',
  })
  async getAvailableQuoteRequests(
    @CurrentUser() user: User,
    @Query() query: GetAvailableQuoteRequestsQueryDto,
  ) {
    return this.quotesService.getAvailableQuoteRequests(user, query);
  }

  @Get('requests/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth('Firebase-JWT')
  @ApiOperation({
    summary: 'Get details of a single quote request (Merchant only)',
    description:
      'Returns details of a specific quote request belonging to the authenticated merchant.',
  })
  @ApiParam({
    name: 'id',
    description: 'QuoteRequest UUID',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @ApiResponse({
    status: 200,
    description: 'Quote request details',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Request does not belong to merchant',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found',
  })
  async getQuoteRequestById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.quotesService.getQuoteRequestById(user, id);
  }

  @Post('requests/:requestId/quotes')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER)
  @ApiBearerAuth('Firebase-JWT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a commercial quote for an open request (Supplier only)',
    description:
      'Submits a commercial quote specifying positive unit price, available quantity, delivery estimate, ' +
      'and future validity date. Validates supplier capability and prevents modifying other suppliers’ quotes.',
  })
  @ApiParam({
    name: 'requestId',
    description: 'QuoteRequest UUID',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @ApiResponse({
    status: 201,
    description: 'Quote submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Invalid price, quantity, expiry, or request status',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Unverified supplier, out of service area, or wrong target',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found: Quote request does not exist',
  })
  async submitQuote(
    @CurrentUser() user: User,
    @Param('requestId') requestId: string,
    @Body() dto: SubmitQuoteDto,
  ) {
    return this.quotesService.submitQuote(user, requestId, dto);
  }

  @Get('supplier/mine')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.SUPPLIER)
  @ApiBearerAuth('Firebase-JWT')
  @ApiOperation({
    summary: 'View own submitted quotes (Supplier only)',
    description:
      'Returns paginated list of commercial quotes submitted by the authenticated supplier.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of submitted supplier quotes',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires SUPPLIER role',
  })
  async getMyQuotes(@CurrentUser() user: User, @Query() query: GetMyQuotesQueryDto) {
    return this.quotesService.getMyQuotes(user, query);
  }

  @Post(':quoteId/decision')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiBearerAuth('Firebase-JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record merchant BUY or DON’T BUY decision (Merchant only)',
    description:
      'Records an explicit BUY or DONT_BUY purchase decision against a supplier quote. ' +
      'Strictly verifies merchant ownership (Zero IDOR). Prevents invalid state transitions and ' +
      'handles repeat submissions predictably. Records intent/decision only without triggering fulfillment.',
  })
  @ApiParam({
    name: 'quoteId',
    description: 'SupplierQuote UUID',
    example: 'e1c4d9a2-1111-4b2a-8c7e-8a9d12345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Decision successfully recorded or idempotent duplicate handled',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Expired quote, closed request, or invalid state transition',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Merchant does not own the quote request',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found: Quote does not exist',
  })
  async recordPurchaseDecision(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Body() dto: RecordPurchaseDecisionDto,
  ) {
    return this.quotesService.recordPurchaseDecision(user, quoteId, dto);
  }
}
