import { Test, TestingModule } from '@nestjs/testing';
import {
  ProductMatcherService,
  ProductWithAliases,
} from './product-matcher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchStatus } from './dto/match-product.dto';

describe('ProductMatcherService (Deterministic Product Matching Engine)', () => {
  let matcherService: ProductMatcherService;

  const mockFloursCategory = {
    id: 'cat-flours-uuid',
    name: 'Flours & Grains',
    slug: 'flours-grains',
  };

  const mockDairyCategory = {
    id: 'cat-dairy-uuid',
    name: 'Dairy & Plant Beverages',
    slug: 'dairy-beverages',
  };

  const mockCatalogProducts: ProductWithAliases[] = [
    {
      id: 'prod-ragi-uuid',
      name: 'Ragi Flour',
      normalizedName: 'ragi flour',
      description: 'Organic finger millet flour',
      imageUrl: null,
      category: mockFloursCategory,
      aliases: [
        { id: 'a-1', alias: 'ragi atta', normalizedAlias: 'ragi atta' },
        { id: 'a-2', alias: 'finger millet flour', normalizedAlias: 'finger millet flour' },
        { id: 'a-3', alias: 'nachni flour', normalizedAlias: 'nachni flour' },
        { id: 'a-4', alias: 'mandua atta', normalizedAlias: 'mandua atta' },
        { id: 'a-5', alias: 'nachni atta', normalizedAlias: 'nachni atta' },
      ],
    },
    {
      id: 'prod-rice-uuid',
      name: 'Rice Flour',
      normalizedName: 'rice flour',
      description: 'Fine white rice flour',
      imageUrl: null,
      category: mockFloursCategory,
      aliases: [
        { id: 'a-6', alias: 'chawal ka atta', normalizedAlias: 'chawal ka atta' },
        { id: 'a-7', alias: 'arisi maavu', normalizedAlias: 'arisi maavu' },
        { id: 'a-8', alias: 'rice atta', normalizedAlias: 'rice atta' },
      ],
    },
    {
      id: 'prod-wheat-uuid',
      name: 'Wheat Flour',
      normalizedName: 'wheat flour',
      description: 'Chakki whole wheat atta',
      imageUrl: null,
      category: mockFloursCategory,
      aliases: [
        { id: 'a-9', alias: 'gehu ka atta', normalizedAlias: 'gehu ka atta' },
        { id: 'a-10', alias: 'whole wheat atta', normalizedAlias: 'whole wheat atta' },
        { id: 'a-11', alias: 'chakki atta', normalizedAlias: 'chakki atta' },
      ],
    },
    {
      id: 'prod-almond-milk-uuid',
      name: 'Almond Milk',
      normalizedName: 'almond milk',
      description: 'Unsweetened almond beverage',
      imageUrl: null,
      category: mockDairyCategory,
      aliases: [
        { id: 'a-12', alias: 'badam milk', normalizedAlias: 'badam milk' },
        { id: 'a-13', alias: 'almond beverage', normalizedAlias: 'almond beverage' },
      ],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductMatcherService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn().mockResolvedValue(mockCatalogProducts),
            },
          },
        },
      ],
    }).compile();

    matcherService = module.get<ProductMatcherService>(ProductMatcherService);
  });

  describe('1. Exact Canonical Product Matching', () => {
    it('should match canonical name "Ragi Flour" with MATCHED status and confidence 1.0', async () => {
      const result = await matcherService.match(
        { query: 'Ragi Flour' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBe(1.0);
      expect(result.match?.name).toBe('Ragi Flour');
      expect(result.match?.id).toBe('prod-ragi-uuid');
      expect(result.explanation).toContain('Exact match found');
    });
  });

  describe('2. Case & Whitespace Normalization', () => {
    it('should normalize mixed case, excess whitespace, and punctuation', async () => {
      const result = await matcherService.match(
        { query: '   rAgI,   FLOUR!!  ' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.normalizedQuery).toBe('ragi flour');
      expect(result.confidence).toBe(1.0);
      expect(result.match?.name).toBe('Ragi Flour');
    });
  });

  describe('3. Exact Alias Matching', () => {
    it('should map "ragi atta" to canonical Ragi Flour with MATCHED and confidence 1.0', async () => {
      const result = await matcherService.match(
        { query: 'ragi atta' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBe(1.0);
      expect(result.match?.name).toBe('Ragi Flour');
      expect(result.explanation).toContain('alias');
    });

    it('should map "finger millet flour" to canonical Ragi Flour', async () => {
      const result = await matcherService.match(
        { query: 'finger millet flour' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBe(1.0);
      expect(result.match?.name).toBe('Ragi Flour');
    });

    it('should map "nachni flour" to canonical Ragi Flour', async () => {
      const result = await matcherService.match(
        { query: 'nachni flour' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBe(1.0);
      expect(result.match?.name).toBe('Ragi Flour');
    });

    it('should map "badam milk" to canonical Almond Milk', async () => {
      const result = await matcherService.match(
        { query: 'badam milk' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBe(1.0);
      expect(result.match?.name).toBe('Almond Milk');
    });
  });

  describe('4. Supported Typo / Fuzzy Matching', () => {
    it('should match minor typo "raagi flour" to Ragi Flour with high confidence', async () => {
      const result = await matcherService.match(
        { query: 'raagi flour' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.match?.name).toBe('Ragi Flour');
    });
  });

  describe('5. Ambiguity & Needs Confirmation Handling', () => {
    it('should flag generic query "flour" as NEEDS_CONFIRMATION and return multiple candidates', async () => {
      const result = await matcherService.match(
        { query: 'flour' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.NEEDS_CONFIRMATION);
      expect(result.match).toBeNull();
      expect(result.candidates.length).toBeGreaterThanOrEqual(3);

      const candidateNames = result.candidates.map((c) => c.product.name);
      expect(candidateNames).toContain('Ragi Flour');
      expect(candidateNames).toContain('Rice Flour');
      expect(candidateNames).toContain('Wheat Flour');
      expect(result.explanation).toContain('Merchant confirmation required');
    });
  });

  describe('6. Distinction Between Distinct Products', () => {
    it('should match "rice flour" to Rice Flour and NOT to Ragi Flour', async () => {
      const result = await matcherService.match(
        { query: 'rice flour' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBe(1.0);
      expect(result.match?.name).toBe('Rice Flour');
      expect(result.match?.name).not.toBe('Ragi Flour');
    });
  });

  describe('7. Unknown Products', () => {
    it('should return NO_MATCH with confidence 0.0 for unknown queries', async () => {
      const result = await matcherService.match(
        { query: 'Quantum Microchip' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.NO_MATCH);
      expect(result.confidence).toBe(0.0);
      expect(result.match).toBeNull();
      expect(result.candidates).toHaveLength(0);
    });
  });

  describe('8. Empty / Blank / Invalid Input Handling', () => {
    it('should return NO_MATCH for empty string or whitespace only', async () => {
      const result = await matcherService.match(
        { query: '     ' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.NO_MATCH);
      expect(result.confidence).toBe(0.0);
      expect(result.match).toBeNull();
    });

    it('should return NO_MATCH for punctuation-only queries', async () => {
      const result = await matcherService.match(
        { query: '!!! ??? ...' },
        mockCatalogProducts,
      );

      expect(result.status).toBe(MatchStatus.NO_MATCH);
      expect(result.confidence).toBe(0.0);
      expect(result.match).toBeNull();
    });
  });
});
