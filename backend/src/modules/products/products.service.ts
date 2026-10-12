import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductMatcherService } from './product-matcher.service';
import { MatchProductDto, ProductMatchResultDto } from './dto/match-product.dto';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { normalizeText } from './utils/text-normalizer.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productMatcherService: ProductMatcherService,
  ) {}

  /**
   * List active products with pagination, category filter, and search.
   */
  async findAll(query: GetProductsQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.categorySlug) {
      where.category = {
        slug: query.categorySlug,
      };
    }

    if (query.search) {
      const normSearch = normalizeText(query.search);
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { normalizedName: { contains: normSearch } },
        {
          aliases: {
            some: {
              normalizedAlias: { contains: normSearch },
            },
          },
        },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          aliases: {
            select: {
              id: true,
              alias: true,
            },
          },
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch single product with its category and aliases
   */
  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        aliases: {
          select: {
            id: true,
            alias: true,
            normalizedAlias: true,
          },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  /**
   * Deterministic matching endpoint service
   */
  async match(dto: MatchProductDto): Promise<ProductMatchResultDto> {
    return this.productMatcherService.match(dto);
  }

  /**
   * Create product and aliases (Admin-only)
   */
  async create(dto: CreateProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException(`Category with ID "${dto.categoryId}" does not exist`);
    }

    const normName = normalizeText(dto.name);
    if (!normName) {
      throw new BadRequestException('Product name cannot be empty or solely whitespace');
    }

    // Prepare aliases
    const rawAliases = dto.aliases || [];
    const aliasEntries: Array<{ alias: string; normalizedAlias: string }> = [];
    const seenNormalized = new Set<string>();

    for (const rawAlias of rawAliases) {
      const normAlias = normalizeText(rawAlias);
      if (normAlias && !seenNormalized.has(normAlias) && normAlias !== normName) {
        seenNormalized.add(normAlias);
        aliasEntries.push({
          alias: rawAlias.trim(),
          normalizedAlias: normAlias,
        });
      }
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        normalizedName: normName,
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        categoryId: dto.categoryId,
        aliases: {
          create: aliasEntries,
        },
      },
      include: {
        category: true,
        aliases: true,
      },
    });

    return product;
  }
}
