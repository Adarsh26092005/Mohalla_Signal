import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchProductDto {
  @ApiProperty({
    description: 'Product name or query text (e.g. "ragi atta", "finger millet flour", "nachni flour")',
    example: 'ragi atta',
  })
  @IsNotEmpty({ message: 'query must not be empty' })
  @IsString()
  @MaxLength(200)
  query: string;

  @ApiPropertyOptional({
    description: 'Optional category ID filter to narrow matching candidates',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export enum MatchStatus {
  MATCHED = 'MATCHED',
  NEEDS_CONFIRMATION = 'NEEDS_CONFIRMATION',
  NO_MATCH = 'NO_MATCH',
}

export interface CandidateCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CandidateProduct {
  id: string;
  name: string;
  normalizedName: string;
  description?: string | null;
  imageUrl?: string | null;
  category: CandidateCategory;
}

export interface MatchCandidate {
  product: CandidateProduct;
  score: number;
  matchedTerm: string;
  matchType: string;
}

export class ProductMatchResultDto {
  @ApiProperty({
    enum: MatchStatus,
    description: 'Match status outcome: MATCHED (confident), NEEDS_CONFIRMATION (ambiguous/partial), NO_MATCH (unknown)',
    example: MatchStatus.MATCHED,
  })
  status: MatchStatus;

  @ApiProperty({
    description: 'Raw input query received',
    example: 'ragi atta',
  })
  query: string;

  @ApiProperty({
    description: 'Normalized query string after whitespace, punctuation, and case normalization',
    example: 'ragi atta',
  })
  normalizedQuery: string;

  @ApiProperty({
    description: 'Deterministic heuristic confidence score (0.0 to 1.0, not a probability)',
    example: 1.0,
  })
  confidence: number;

  @ApiPropertyOptional({
    description: 'Best matching canonical product (populated for MATCHED status, or null for NO_MATCH / NEEDS_CONFIRMATION)',
  })
  match: CandidateProduct | null;

  @ApiProperty({
    description: 'List of relevant candidate products evaluated during matching',
  })
  candidates: MatchCandidate[];

  @ApiProperty({
    description: 'Human-readable explanation of the deterministic match decision',
    example: 'Exact match found via product alias "ragi atta" for canonical product "Ragi Flour".',
  })
  explanation: string;
}
