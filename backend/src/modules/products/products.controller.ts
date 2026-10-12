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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { MatchProductDto, ProductMatchResultDto } from './dto/match-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List active catalog products',
    description:
      'Public endpoint to browse and search active products in the neighborhood catalog with pagination and category filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of active products',
  })
  async findAll(@Query() query: GetProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Post('match')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deterministic Product Matching Engine',
    description:
      'Evaluates raw product text from merchant voice/text capture against canonical products and curated aliases. ' +
      'Returns MATCHED (confident), NEEDS_CONFIRMATION (ambiguous), or NO_MATCH with heuristic confidence scores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Deterministic match result with candidate ranking and explanation',
    type: ProductMatchResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Missing or invalid query parameter',
  })
  async match(@Body() dto: MatchProductDto): Promise<ProductMatchResultDto> {
    return this.productsService.match(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single product details by ID',
    description: 'Public endpoint to retrieve a canonical product with its category and aliases.',
  })
  @ApiParam({
    name: 'id',
    description: 'Product UUID',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @ApiResponse({
    status: 200,
    description: 'Product details, category, and aliases',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('Firebase-JWT')
  @ApiOperation({
    summary: 'Create a new catalog product (Admin only)',
    description:
      'Authenticated endpoint restricted to ADMIN role to register canonical products and curated aliases.',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: Missing or invalid Firebase ID token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: Requires ADMIN role',
  })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }
}
