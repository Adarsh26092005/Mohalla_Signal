import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MatchProductDto,
  ProductMatchResultDto,
  MatchStatus,
  MatchCandidate,
} from './dto/match-product.dto';
import { normalizeText } from './utils/text-normalizer.util';
import { calculateMatchScore } from './utils/similarity.util';

export interface ProductWithAliases {
  id: string;
  name: string;
  normalizedName: string;
  description?: string | null;
  imageUrl?: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  aliases: Array<{
    id: string;
    alias: string;
    normalizedAlias: string;
  }>;
}

@Injectable()
export class ProductMatcherService {
  private readonly logger = new Logger(ProductMatcherService.name);

  // Confidence thresholds (Deterministic heuristics, not probabilities)
  public static readonly EXACT_MATCH_THRESHOLD = 1.0;
  public static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  public static readonly MINIMUM_RELEVANCE_THRESHOLD = 0.45;
  public static readonly AMBIGUITY_DELTA_THRESHOLD = 0.15;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Matches a raw merchant/customer text query against active products and aliases.
   * Can accept an optional pre-loaded product list for pure in-memory unit testing.
   */
  async match(
    dto: MatchProductDto,
    preloadedProducts?: ProductWithAliases[],
  ): Promise<ProductMatchResultDto> {
    const rawQuery = dto.query || '';
    const normQuery = normalizeText(rawQuery);

    if (!normQuery) {
      return {
        status: MatchStatus.NO_MATCH,
        query: rawQuery,
        normalizedQuery: '',
        confidence: 0.0,
        match: null,
        candidates: [],
        explanation: 'Empty or invalid query text provided.',
      };
    }

    // 1. Fetch products if not supplied in-memory
    const products = preloadedProducts || (await this.fetchActiveProducts(dto.categoryId));

    if (!products || products.length === 0) {
      return {
        status: MatchStatus.NO_MATCH,
        query: rawQuery,
        normalizedQuery: normQuery,
        confidence: 0.0,
        match: null,
        candidates: [],
        explanation: 'No active products available in catalog for matching.',
      };
    }

    // 2. Score query against every product (canonical name and all curated aliases)
    const evaluatedCandidates: MatchCandidate[] = [];

    for (const prod of products) {
      let bestProductScore = 0.0;
      let bestMatchedTerm = prod.name;
      let bestMatchType = 'NO_MATCH';

      // Score against canonical name
      const canonicalResult = calculateMatchScore(normQuery, prod.normalizedName, false);
      if (canonicalResult.score > bestProductScore) {
        bestProductScore = canonicalResult.score;
        bestMatchedTerm = prod.name;
        bestMatchType = canonicalResult.matchType;
      }

      // Score against curated aliases
      if (prod.aliases && prod.aliases.length > 0) {
        for (const aliasObj of prod.aliases) {
          const aliasResult = calculateMatchScore(normQuery, aliasObj.normalizedAlias, true);
          if (aliasResult.score > bestProductScore) {
            bestProductScore = aliasResult.score;
            bestMatchedTerm = aliasObj.alias;
            bestMatchType = aliasResult.matchType;
          }
        }
      }

      if (bestProductScore >= ProductMatcherService.MINIMUM_RELEVANCE_THRESHOLD) {
        evaluatedCandidates.push({
          product: {
            id: prod.id,
            name: prod.name,
            normalizedName: prod.normalizedName,
            description: prod.description,
            imageUrl: prod.imageUrl,
            category: prod.category,
          },
          score: bestProductScore,
          matchedTerm: bestMatchedTerm,
          matchType: bestMatchType,
        });
      }
    }

    // 3. Sort candidates descending by heuristic score
    evaluatedCandidates.sort((a, b) => b.score - a.score);

    // 4. Deterministic decision engine
    return this.evaluateMatchDecision(rawQuery, normQuery, evaluatedCandidates);
  }

  /**
   * Deterministically decides MATCHED, NEEDS_CONFIRMATION, or NO_MATCH based on scores and ambiguity.
   */
  private evaluateMatchDecision(
    rawQuery: string,
    normQuery: string,
    candidates: MatchCandidate[],
  ): ProductMatchResultDto {
    if (candidates.length === 0) {
      return {
        status: MatchStatus.NO_MATCH,
        query: rawQuery,
        normalizedQuery: normQuery,
        confidence: 0.0,
        match: null,
        candidates: [],
        explanation: `No matching product found in the catalog for "${rawQuery}".`,
      };
    }

    const topCandidate = candidates[0];
    const secondCandidate = candidates.length > 1 ? candidates[1] : null;

    // A. EXACT MATCH (Score = 1.0)
    if (topCandidate.score >= ProductMatcherService.EXACT_MATCH_THRESHOLD) {
      // Check if second candidate is also exact (rare multi-product collision)
      if (secondCandidate && secondCandidate.score >= ProductMatcherService.EXACT_MATCH_THRESHOLD) {
        return {
          status: MatchStatus.NEEDS_CONFIRMATION,
          query: rawQuery,
          normalizedQuery: normQuery,
          confidence: 0.95,
          match: null,
          candidates,
          explanation: `Multiple products matched with exact confidence for "${rawQuery}". Merchant confirmation required.`,
        };
      }

      return {
        status: MatchStatus.MATCHED,
        query: rawQuery,
        normalizedQuery: normQuery,
        confidence: 1.0,
        match: topCandidate.product,
        candidates: [topCandidate],
        explanation: `Exact match found via ${this.formatMatchType(topCandidate.matchType)} "${topCandidate.matchedTerm}" for canonical product "${topCandidate.product.name}".`,
      };
    }

    // B. HIGH CONFIDENCE MATCH (Score >= 0.85, e.g. minor typo or high containment)
    if (topCandidate.score >= ProductMatcherService.HIGH_CONFIDENCE_THRESHOLD) {
      const isAmbiguous =
        secondCandidate &&
        topCandidate.score - secondCandidate.score <
          ProductMatcherService.AMBIGUITY_DELTA_THRESHOLD;

      if (isAmbiguous && secondCandidate) {
        return {
          status: MatchStatus.NEEDS_CONFIRMATION,
          query: rawQuery,
          normalizedQuery: normQuery,
          confidence: topCandidate.score,
          match: null,
          candidates,
          explanation: `Ambiguous match between "${topCandidate.product.name}" (${topCandidate.score}) and "${secondCandidate.product.name}" (${secondCandidate.score}). Merchant confirmation required.`,
        };
      }

      return {
        status: MatchStatus.MATCHED,
        query: rawQuery,
        normalizedQuery: normQuery,
        confidence: topCandidate.score,
        match: topCandidate.product,
        candidates: [topCandidate],
        explanation: `High confidence match via ${this.formatMatchType(topCandidate.matchType)} "${topCandidate.matchedTerm}" for canonical product "${topCandidate.product.name}".`,
      };
    }

    // C. PARTIAL / AMBIGUOUS MATCH (Score between 0.45 and 0.84, e.g. generic query "flour")
    return {
      status: MatchStatus.NEEDS_CONFIRMATION,
      query: rawQuery,
      normalizedQuery: normQuery,
      confidence: topCandidate.score,
      match: null,
      candidates,
      explanation: `Generic or partial match found (${candidates.length} potential candidates). Merchant confirmation required.`,
    };
  }

  private formatMatchType(type: string): string {
    switch (type) {
      case 'EXACT_CANONICAL':
        return 'canonical name';
      case 'EXACT_ALIAS':
        return 'alias';
      case 'TOKEN_CONTAINMENT':
        return 'phrase containment';
      case 'FUZZY_TYPO':
        return 'fuzzy match';
      default:
        return 'partial match';
    }
  }

  /**
   * Fetches active products and aliases from PostgreSQL via Prisma
   */
  private async fetchActiveProducts(categoryId?: string): Promise<ProductWithAliases[]> {
    try {
      const whereClause: any = { isActive: true };
      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

      const products = await this.prisma.product.findMany({
        where: whereClause,
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
              normalizedAlias: true,
            },
          },
        },
      });

      return products;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch active products from database: ${
          error instanceof Error ? error.message : 'Database error'
        }`,
      );
      return [];
    }
  }
}
