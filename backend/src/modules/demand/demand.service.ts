import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductMatcherService } from '../products/product-matcher.service';
import { MatchStatus } from '../products/dto/match-product.dto';
import { CreateMissedDemandDto } from './dto/create-missed-demand.dto';
import { ConfirmMissedDemandDto } from './dto/confirm-missed-demand.dto';
import { GetMyDemandQueryDto } from './dto/get-my-demand-query.dto';
import { GetDemandSignalsQueryDto } from './dto/get-demand-signals-query.dto';
import { normalizeText } from '../products/utils/text-normalizer.util';
import { User, Role } from '@prisma/client';

export type DemandSignalBand = 'HIGH_DEMAND' | 'MODERATE_DEMAND';

export interface NeighborhoodDemandSignal {
  neighborhood: {
    id: string;
    name: string;
    slug: string;
    city: string;
    pincode: string;
  };
  product: {
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
  signalLevel: 'HIGH' | 'MEDIUM';
  demandBand: DemandSignalBand;
  isEligibleForSupplierQuote: boolean;
  thresholdMet: boolean;
}

@Injectable()
export class DemandService {
  private readonly logger = new Logger(DemandService.name);
  private readonly defaultThreshold: number;
  private readonly defaultCooldownHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly productMatcherService: ProductMatcherService,
    private readonly configService: ConfigService,
  ) {
    this.defaultThreshold = this.configService.get<number>(
      'demand.merchantThreshold',
      3,
    );
    this.defaultCooldownHours = this.configService.get<number>(
      'demand.cooldownHours',
      24,
    );
  }

  /**
   * Helper: Resolves and verifies the authenticated merchant's profile and neighborhood.
   * Strictly enforces explicit, verified neighborhood assignments.
   * Never silently auto-assigns neighborhoods based on PIN code.
   */
  private async getMerchantProfileAndNeighborhood(user: User) {
    if (user.role !== Role.MERCHANT) {
      throw new BadRequestException('User must have MERCHANT role to perform this action');
    }

    const merchantProfile = await this.prisma.merchantProfile.findUnique({
      where: { userId: user.id },
      include: { neighborhood: true },
    });

    if (!merchantProfile) {
      throw new BadRequestException(
        'Merchant profile not found for the authenticated user. Please complete onboarding.',
      );
    }

    // Explicit valid neighborhood assignment required. No silent PIN-code auto-assignment.
    if (!merchantProfile.neighborhoodId || !merchantProfile.neighborhood) {
      throw new BadRequestException(
        'Merchant shop is not assigned to a verified neighborhood. Neighborhood assignment must be completed through an authorized assignment flow or by an administrator.',
      );
    }

    return {
      merchantProfile,
      neighborhood: merchantProfile.neighborhood,
    };
  }

  /**
   * Captures a missed product demand request for an authenticated merchant.
   * Runs the deterministic matching engine:
   * - MATCHED: Persists demand record immediately (with duplicate cooldown deduplication).
   * - NEEDS_CONFIRMATION: Returns candidates without persisting, requesting merchant confirmation.
   * - NO_MATCH: Returns no-match result without persisting.
   */
  async recordMissedDemand(user: User, dto: CreateMissedDemandDto) {
    const { merchantProfile, neighborhood } =
      await this.getMerchantProfileAndNeighborhood(user);

    const normQuery = normalizeText(dto.query);
    if (!normQuery) {
      throw new BadRequestException('Query text cannot be empty or invalid');
    }

    // Run deterministic product matching engine
    const matchResult = await this.productMatcherService.match({
      query: dto.query,
    });

    if (matchResult.status === MatchStatus.MATCHED && matchResult.match) {
      // Cooldown / Deduplication check: prevent repeated submissions by the same merchant for the same product
      const cooldownThreshold = new Date(
        Date.now() - this.defaultCooldownHours * 60 * 60 * 1000,
      );

      const existingRecentDemand = await this.prisma.missedDemand.findFirst({
        where: {
          merchantId: merchantProfile.id,
          productId: matchResult.match.id,
          neighborhoodId: neighborhood.id,
          createdAt: {
            gte: cooldownThreshold,
          },
        },
        include: {
          product: {
            include: { category: true },
          },
          neighborhood: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingRecentDemand) {
        this.logger.log(
          `Demand deduplicated for merchant ${merchantProfile.id} [${merchantProfile.shopName}]: "${dto.query}" -> ${matchResult.match.name} within ${this.defaultCooldownHours}h cooldown window`,
        );

        return {
          status: 'RECORDED',
          demandId: existingRecentDemand.id,
          matchedProduct: existingRecentDemand.product,
          neighborhood: {
            id: neighborhood.id,
            name: neighborhood.name,
            city: neighborhood.city,
          },
          confidence: matchResult.confidence,
          explanation: matchResult.explanation,
          message:
            'Missed customer demand already recorded recently for this product. Existing record maintained.',
        };
      }

      // Matched: Create persistent demand record
      const missedDemand = await this.prisma.missedDemand.create({
        data: {
          merchantId: merchantProfile.id,
          productId: matchResult.match.id,
          neighborhoodId: neighborhood.id,
          rawQuery: dto.query.trim(),
          normalizedQuery: normQuery,
          notes: dto.notes?.trim() || null,
        },
        include: {
          product: {
            include: { category: true },
          },
          neighborhood: true,
        },
      });

      this.logger.log(
        `Demand recorded for merchant ${merchantProfile.id} [${merchantProfile.shopName}]: "${dto.query}" -> ${matchResult.match.name} in ${neighborhood.name}`,
      );

      return {
        status: 'RECORDED',
        demandId: missedDemand.id,
        matchedProduct: missedDemand.product,
        neighborhood: {
          id: neighborhood.id,
          name: neighborhood.name,
          city: neighborhood.city,
        },
        confidence: matchResult.confidence,
        explanation: matchResult.explanation,
        message: 'Missed customer demand successfully recorded.',
      };
    }

    if (matchResult.status === MatchStatus.NEEDS_CONFIRMATION) {
      // Ambiguous: Do not record, return candidate options for merchant confirmation
      return {
        status: 'NEEDS_CONFIRMATION',
        query: dto.query,
        normalizedQuery: normQuery,
        confidence: matchResult.confidence,
        candidates: matchResult.candidates,
        explanation: matchResult.explanation,
        message:
          'Multiple potential catalog products match this request. Please call POST /api/v1/demand/missed/confirm to confirm.',
      };
    }

    // No Match: Do not record
    return {
      status: 'NO_MATCH',
      query: dto.query,
      normalizedQuery: normQuery,
      confidence: 0.0,
      candidates: [],
      explanation: matchResult.explanation,
      message:
        'Product not recognized in catalog. No demand record was created.',
    };
  }

  /**
   * Confirms and persists an ambiguous demand query using the merchant's selected canonical product.
   * Validates that the submitted productId is an eligible candidate from the deterministic matcher.
   * Rejects unrelated or invalid product IDs with BadRequestException.
   */
  async confirmMissedDemand(user: User, dto: ConfirmMissedDemandDto) {
    const { merchantProfile, neighborhood } =
      await this.getMerchantProfileAndNeighborhood(user);

    const normQuery = normalizeText(dto.query);
    if (!normQuery) {
      throw new BadRequestException('Query text cannot be empty or invalid');
    }

    // Re-run product matcher service on the query to validate candidate eligibility
    const matchResult = await this.productMatcherService.match({
      query: dto.query,
    });

    // Extract valid candidate IDs from actual matcher response shape
    const eligibleCandidateIds = new Set<string>();
    if (matchResult.match?.id) {
      eligibleCandidateIds.add(matchResult.match.id);
    }
    if (Array.isArray(matchResult.candidates)) {
      for (const candidate of matchResult.candidates) {
        if (candidate.product?.id) {
          eligibleCandidateIds.add(candidate.product.id);
        }
      }
    }

    if (!eligibleCandidateIds.has(dto.productId)) {
      throw new BadRequestException(
        'Selected product is not an eligible candidate for this query',
      );
    }

    // Verify canonical product exists in database and is active
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { category: true },
    });

    if (!product || !product.isActive) {
      throw new BadRequestException('Selected product does not exist or is inactive');
    }

    // Cooldown / Deduplication check: prevent duplicate submissions within cooldown window
    const cooldownThreshold = new Date(
      Date.now() - this.defaultCooldownHours * 60 * 60 * 1000,
    );

    const existingRecentDemand = await this.prisma.missedDemand.findFirst({
      where: {
        merchantId: merchantProfile.id,
        productId: product.id,
        neighborhoodId: neighborhood.id,
        createdAt: {
          gte: cooldownThreshold,
        },
      },
      include: {
        product: {
          include: { category: true },
        },
        neighborhood: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingRecentDemand) {
      this.logger.log(
        `Confirmed demand deduplicated for merchant ${merchantProfile.id}: ${product.name} within ${this.defaultCooldownHours}h cooldown window`,
      );

      return {
        status: 'RECORDED',
        demandId: existingRecentDemand.id,
        matchedProduct: existingRecentDemand.product,
        neighborhood: {
          id: neighborhood.id,
          name: neighborhood.name,
          city: neighborhood.city,
        },
        message:
          'Missed customer demand already recorded recently for this product. Existing record maintained.',
      };
    }

    const missedDemand = await this.prisma.missedDemand.create({
      data: {
        merchantId: merchantProfile.id,
        productId: product.id,
        neighborhoodId: neighborhood.id,
        rawQuery: dto.query.trim(),
        normalizedQuery: normQuery,
        notes: dto.notes?.trim() || null,
      },
      include: {
        product: {
          include: { category: true },
        },
        neighborhood: true,
      },
    });

    return {
      status: 'RECORDED',
      demandId: missedDemand.id,
      matchedProduct: product,
      neighborhood: {
        id: neighborhood.id,
        name: neighborhood.name,
        city: neighborhood.city,
      },
      message: 'Demand confirmed and recorded successfully.',
    };
  }

  /**
   * Returns demand history strictly for the authenticated merchant (Zero IDOR / BOLA).
   */
  async getMyDemands(user: User, query: GetMyDemandQueryDto) {
    if (user.role !== Role.MERCHANT) {
      throw new BadRequestException('User must have MERCHANT role');
    }

    const merchantProfile = await this.prisma.merchantProfile.findUnique({
      where: { userId: user.id },
    });

    if (!merchantProfile) {
      throw new BadRequestException('Merchant profile not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where = { merchantId: merchantProfile.id };

    const [total, demands] = await Promise.all([
      this.prisma.missedDemand.count({ where }),
      this.prisma.missedDemand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          neighborhood: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
            },
          },
        },
      }),
    ]);

    return {
      data: demands,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Privacy-Preserving Neighborhood Demand Aggregation.
   *
   * Core Privacy Invariants:
   * 1. Requires at least `threshold` (default: 3) DISTINCT merchants in the neighborhood.
   * 2. Multiple requests from the same merchant count as 1 distinct merchant.
   * 3. Groups below the threshold are COMPLETELY OMITTED from the output.
   * 4. Output contains NO merchant IDs, NO merchant names, and NO per-merchant breakdown.
   * 5. Exact merchant and request counts are removed from the public response to prevent differencing attacks.
   * 6. Returns only privacy-safe qualitative demand bands ('HIGH' vs 'MEDIUM', 'HIGH_DEMAND' vs 'MODERATE_DEMAND').
   * 7. Ordering does not leak relative request counts.
   */
  async getNeighborhoodSignals(
    query: GetDemandSignalsQueryDto,
  ): Promise<NeighborhoodDemandSignal[]> {
    const threshold = this.defaultThreshold;

    const where: any = {};
    if (query.neighborhoodId) {
      where.neighborhoodId = query.neighborhoodId;
    }
    if (query.neighborhoodSlug) {
      where.neighborhood = { slug: query.neighborhoodSlug };
    }
    if (query.categoryId) {
      where.product = { categoryId: query.categoryId };
    }
    if (query.categorySlug) {
      where.product = {
        ...where.product,
        category: { slug: query.categorySlug },
      };
    }

    // Retrieve demands with required relations for aggregation
    const demands = await this.prisma.missedDemand.findMany({
      where,
      select: {
        merchantId: true,
        neighborhoodId: true,
        productId: true,
        neighborhood: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            pincode: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Group by `${neighborhoodId}:${productId}`
    const groups = new Map<
      string,
      {
        neighborhood: {
          id: string;
          name: string;
          slug: string;
          city: string;
          pincode: string;
        };
        product: {
          id: string;
          name: string;
          category: {
            id: string;
            name: string;
            slug: string;
          };
        };
        distinctMerchants: Set<string>;
      }
    >();

    for (const item of demands) {
      const key = `${item.neighborhoodId}:${item.productId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          neighborhood: item.neighborhood,
          product: item.product,
          distinctMerchants: new Set<string>(),
        });
      }

      const group = groups.get(key)!;
      group.distinctMerchants.add(item.merchantId);
    }

    // Filter strictly by privacy threshold: distinct merchants >= threshold
    const eligibleSignals: NeighborhoodDemandSignal[] = [];

    for (const [, group] of groups) {
      const distinctCount = group.distinctMerchants.size;

      // PRIVACY THRESHOLD ENFORCEMENT:
      // Sub-threshold signals (< 3 distinct merchants) MUST NOT be exposed.
      if (distinctCount >= threshold) {
        const isHigh = distinctCount >= threshold + 2;
        eligibleSignals.push({
          neighborhood: group.neighborhood,
          product: group.product,
          signalLevel: isHigh ? 'HIGH' : 'MEDIUM',
          demandBand: isHigh ? 'HIGH_DEMAND' : 'MODERATE_DEMAND',
          isEligibleForSupplierQuote: true,
          thresholdMet: true,
        });
      }
    }

    // Sort privacy-safely by signalLevel ('HIGH' before 'MEDIUM'), then alphabetically by product name and neighborhood name
    // (Never sort by exact counts to avoid leaking relative merchant activity)
    eligibleSignals.sort((a, b) => {
      if (a.signalLevel !== b.signalLevel) {
        return a.signalLevel === 'HIGH' ? -1 : 1;
      }
      const prodCompare = a.product.name.localeCompare(b.product.name);
      if (prodCompare !== 0) return prodCompare;
      return a.neighborhood.name.localeCompare(b.neighborhood.name);
    });

    return eligibleSignals;
  }

  /**
   * Admin: Assigns a merchant to a designated neighborhood.
   */
  async assignMerchantNeighborhood(merchantId: string, neighborhoodId: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) {
      throw new NotFoundException(`Merchant with ID "${merchantId}" not found`);
    }

    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id: neighborhoodId },
    });
    if (!neighborhood) {
      throw new NotFoundException(`Neighborhood with ID "${neighborhoodId}" not found`);
    }

    const updated = await this.prisma.merchantProfile.update({
      where: { id: merchantId },
      data: { neighborhoodId },
      include: { neighborhood: true },
    });

    return updated;
  }
}
