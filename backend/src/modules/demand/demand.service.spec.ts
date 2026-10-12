import { Test, TestingModule } from '@nestjs/testing';
import { DemandService } from './demand.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductMatcherService } from '../products/product-matcher.service';
import { ConfigService } from '@nestjs/config';
import { MatchStatus } from '../products/dto/match-product.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('DemandService (Security Fixes, Privacy Thresholds & Demand Deduplication)', () => {
  let demandService: DemandService;
  let prisma: any;
  let matcherService: any;

  const mockMerchantUser = {
    id: 'user-merchant-uuid-1',
    firebaseUid: 'firebase-uid-merchant-1',
    role: Role.MERCHANT,
    isActive: true,
  };

  const mockCustomerUser = {
    id: 'user-customer-uuid-1',
    firebaseUid: 'firebase-uid-customer-1',
    role: Role.CUSTOMER,
    isActive: true,
  };

  const mockSupplierUser = {
    id: 'user-supplier-uuid-1',
    firebaseUid: 'firebase-uid-supplier-1',
    role: Role.SUPPLIER,
    isActive: true,
  };

  const mockNeighborhood = {
    id: 'neigh-indiranagar-uuid',
    name: 'Indiranagar',
    slug: 'indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
  };

  const mockMerchantProfile = {
    id: 'merchant-profile-1',
    userId: 'user-merchant-uuid-1',
    shopName: 'Shri Ram Kirana Store',
    storeAddress: '100ft Road, Indiranagar',
    pincode: '560038',
    neighborhoodId: 'neigh-indiranagar-uuid',
    neighborhood: mockNeighborhood,
  };

  const mockProductRagi = {
    id: 'prod-ragi-uuid',
    name: 'Ragi Flour',
    normalizedName: 'ragi flour',
    categoryId: 'cat-flours-uuid',
    isActive: true,
    category: {
      id: 'cat-flours-uuid',
      name: 'Flours & Grains',
      slug: 'flours-grains',
    },
  };

  const mockProductRice = {
    id: 'prod-rice-uuid',
    name: 'Rice Flour',
    normalizedName: 'rice flour',
    categoryId: 'cat-flours-uuid',
    isActive: true,
    category: {
      id: 'cat-flours-uuid',
      name: 'Flours & Grains',
      slug: 'flours-grains',
    },
  };

  beforeEach(async () => {
    prisma = {
      merchantProfile: {
        findUnique: jest.fn().mockResolvedValue(mockMerchantProfile),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      neighborhood: {
        findFirst: jest.fn().mockResolvedValue(mockNeighborhood),
        findUnique: jest.fn().mockResolvedValue(mockNeighborhood),
      },
      product: {
        findUnique: jest.fn(),
      },
      missedDemand: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    matcherService = {
      match: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ProductMatcherService,
          useValue: matcherService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: any) => {
              if (key === 'demand.merchantThreshold') return 3;
              if (key === 'demand.cooldownHours') return 24;
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    demandService = module.get<DemandService>(DemandService);
  });

  describe('1. Role Authorization Checks', () => {
    it('should reject CUSTOMER role attempting to capture demand with BadRequestException', async () => {
      await expect(
        demandService.recordMissedDemand(mockCustomerUser as any, {
          query: 'ragi atta',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject SUPPLIER role attempting to capture demand with BadRequestException', async () => {
      await expect(
        demandService.recordMissedDemand(mockSupplierUser as any, {
          query: 'ragi atta',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Product Confirmation Candidate Validation (Section A)', () => {
    it('should reject a product that is not a valid candidate for the query with BadRequestException', async () => {
      // Query "flour" returns only Ragi Flour and Rice Flour as candidates
      matcherService.match.mockResolvedValue({
        status: MatchStatus.NEEDS_CONFIRMATION,
        normalizedQuery: 'flour',
        confidence: 0.6,
        match: null,
        candidates: [
          { product: mockProductRagi, score: 0.6, matchedTerm: 'ragi flour', matchType: 'TOKEN_PARTIAL' },
          { product: mockProductRice, score: 0.6, matchedTerm: 'rice flour', matchType: 'TOKEN_PARTIAL' },
        ],
        explanation: 'Multiple candidates match query',
      });

      // Merchant attempts to submit an arbitrary unrelated productId (e.g. Almond Milk or fabricated ID)
      await expect(
        demandService.confirmMissedDemand(mockMerchantUser as any, {
          query: 'flour',
          productId: 'unrelated-or-arbitrary-product-id',
        }),
      ).rejects.toThrow(
        new BadRequestException('Selected product is not an eligible candidate for this query'),
      );

      expect(prisma.missedDemand.create).not.toHaveBeenCalled();
    });

    it('should accept a valid candidate returned by the product-matching service', async () => {
      matcherService.match.mockResolvedValue({
        status: MatchStatus.NEEDS_CONFIRMATION,
        normalizedQuery: 'flour',
        confidence: 0.6,
        match: null,
        candidates: [
          { product: mockProductRagi, score: 0.6, matchedTerm: 'ragi flour', matchType: 'TOKEN_PARTIAL' },
          { product: mockProductRice, score: 0.6, matchedTerm: 'rice flour', matchType: 'TOKEN_PARTIAL' },
        ],
        explanation: 'Multiple candidates match query',
      });

      prisma.product.findUnique.mockResolvedValue(mockProductRagi);
      prisma.missedDemand.create.mockResolvedValue({
        id: 'demand-confirmed-uuid-1',
        merchantId: 'merchant-profile-1',
        productId: mockProductRagi.id,
        neighborhoodId: mockNeighborhood.id,
        rawQuery: 'flour',
        product: mockProductRagi,
        neighborhood: mockNeighborhood,
      });

      const result = await demandService.confirmMissedDemand(
        mockMerchantUser as any,
        {
          query: 'flour',
          productId: mockProductRagi.id,
          notes: 'Customer specifically requested Ragi',
        },
      );

      expect(result.status).toBe('RECORDED');
      expect((result as any).demandId).toBe('demand-confirmed-uuid-1');
      expect((result as any).matchedProduct.name).toBe('Ragi Flour');
      expect(prisma.missedDemand.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Public Demand Signals Privacy Hardening (Section B)', () => {
    it('should NOT produce a signal when fewer than 3 distinct merchants request product', async () => {
      const mockDemands = [
        { merchantId: 'm-1', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-2', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
      ];

      prisma.missedDemand.findMany.mockResolvedValue(mockDemands);

      const signals = await demandService.getNeighborhoodSignals({});

      // Sub-threshold signals (< 3 distinct merchants) MUST NOT be exposed
      expect(signals).toHaveLength(0);
    });

    it('should return privacy-safe qualitative demand bands without exposing exact counts or merchant identities', async () => {
      const mockDemands = [
        { merchantId: 'm-1', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-2', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-3', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-1', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
      ];

      prisma.missedDemand.findMany.mockResolvedValue(mockDemands);

      const signals = await demandService.getNeighborhoodSignals({});

      expect(signals).toHaveLength(1);
      const signal = signals[0];

      // Privacy checks:
      expect(signal.product.name).toBe('Ragi Flour');
      expect(signal.neighborhood.name).toBe('Indiranagar');
      expect(signal.signalLevel).toBe('MEDIUM');
      expect(signal.demandBand).toBe('MODERATE_DEMAND');
      expect(signal.thresholdMet).toBe(true);
      expect(signal.isEligibleForSupplierQuote).toBe(true);

      // CRITICAL: Ensure exact counts are NEVER exposed
      expect((signal as any).distinctMerchantsCount).toBeUndefined();
      expect((signal as any).totalRequestsCount).toBeUndefined();

      // CRITICAL: Ensure zero merchant PII or identifiers are exposed
      expect((signal as any).merchantId).toBeUndefined();
      expect((signal as any).merchantName).toBeUndefined();
      expect((signal as any).merchants).toBeUndefined();
      expect((signal as any).distinctMerchants).toBeUndefined();
    });

    it('should assign HIGH_DEMAND band when 5 or more distinct merchants request the product', async () => {
      const mockDemands = [
        { merchantId: 'm-1', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-2', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-3', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-4', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
        { merchantId: 'm-5', neighborhoodId: 'n-1', productId: 'p-ragi', neighborhood: mockNeighborhood, product: mockProductRagi },
      ];

      prisma.missedDemand.findMany.mockResolvedValue(mockDemands);

      const signals = await demandService.getNeighborhoodSignals({});

      expect(signals).toHaveLength(1);
      expect(signals[0].signalLevel).toBe('HIGH');
      expect(signals[0].demandBand).toBe('HIGH_DEMAND');
    });
  });

  describe('4. Duplicate-Demand Inflation Prevention (Section C)', () => {
    it('should deduplicate repeated requests from the same merchant within the cooldown window', async () => {
      matcherService.match.mockResolvedValue({
        status: MatchStatus.MATCHED,
        normalizedQuery: 'ragi atta',
        confidence: 1.0,
        match: mockProductRagi,
        explanation: 'Exact alias match',
      });

      const existingRecentRecord = {
        id: 'existing-demand-uuid-1',
        merchantId: 'merchant-profile-1',
        productId: mockProductRagi.id,
        neighborhoodId: mockNeighborhood.id,
        rawQuery: 'ragi atta',
        product: mockProductRagi,
        neighborhood: mockNeighborhood,
        createdAt: new Date(),
      };

      // Mock that an existing demand was recorded within the last 24 hours
      prisma.missedDemand.findFirst.mockResolvedValue(existingRecentRecord);

      const result = await demandService.recordMissedDemand(
        mockMerchantUser as any,
        { query: 'ragi atta' },
      );

      // Returns existing demand without creating a new database record
      expect(result.status).toBe('RECORDED');
      expect((result as any).demandId).toBe('existing-demand-uuid-1');
      expect(result.message).toContain('already recorded recently');
      expect(prisma.missedDemand.create).not.toHaveBeenCalled();
    });

    it('should create a new demand record if previous request is outside the cooldown window', async () => {
      matcherService.match.mockResolvedValue({
        status: MatchStatus.MATCHED,
        normalizedQuery: 'ragi atta',
        confidence: 1.0,
        match: mockProductRagi,
        explanation: 'Exact alias match',
      });

      // No record found within the 24h window
      prisma.missedDemand.findFirst.mockResolvedValue(null);
      prisma.missedDemand.create.mockResolvedValue({
        id: 'new-demand-uuid-1',
        merchantId: 'merchant-profile-1',
        productId: mockProductRagi.id,
        neighborhoodId: mockNeighborhood.id,
        rawQuery: 'ragi atta',
        product: mockProductRagi,
        neighborhood: mockNeighborhood,
      });

      const result = await demandService.recordMissedDemand(
        mockMerchantUser as any,
        { query: 'ragi atta' },
      );

      expect(result.status).toBe('RECORDED');
      expect((result as any).demandId).toBe('new-demand-uuid-1');
      expect(prisma.missedDemand.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Neighborhood Assignment Security (Section D)', () => {
    it('should reject demand capture if merchant is not assigned to a verified neighborhood', async () => {
      // Merchant profile with no neighborhoodId
      prisma.merchantProfile.findUnique.mockResolvedValue({
        ...mockMerchantProfile,
        neighborhoodId: null,
        neighborhood: null,
      });

      await expect(
        demandService.recordMissedDemand(mockMerchantUser as any, {
          query: 'ragi atta',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Merchant shop is not assigned to a verified neighborhood. Neighborhood assignment must be completed through an authorized assignment flow or by an administrator.',
        ),
      );

      // Verify that no silent auto-association was attempted via neighborhood.findFirst
      expect(prisma.neighborhood.findFirst).not.toHaveBeenCalled();
      expect(prisma.merchantProfile.update).not.toHaveBeenCalled();
    });

    it('should allow admin to assign a valid merchant to a valid neighborhood', async () => {
      prisma.merchantProfile.findUnique.mockResolvedValue(mockMerchantProfile);
      prisma.neighborhood.findUnique.mockResolvedValue(mockNeighborhood);
      prisma.merchantProfile.update.mockResolvedValue({
        ...mockMerchantProfile,
        neighborhoodId: mockNeighborhood.id,
        neighborhood: mockNeighborhood,
      });

      const result = await demandService.assignMerchantNeighborhood(
        'merchant-profile-1',
        'neigh-indiranagar-uuid',
      );

      expect(result.neighborhoodId).toBe('neigh-indiranagar-uuid');
      expect(prisma.merchantProfile.update).toHaveBeenCalledWith({
        where: { id: 'merchant-profile-1' },
        data: { neighborhoodId: 'neigh-indiranagar-uuid' },
        include: { neighborhood: true },
      });
    });

    it('should reject admin assignment when neighborhood does not exist', async () => {
      prisma.merchantProfile.findUnique.mockResolvedValue(mockMerchantProfile);
      prisma.neighborhood.findUnique.mockResolvedValue(null);

      await expect(
        demandService.assignMerchantNeighborhood(
          'merchant-profile-1',
          'non-existent-neigh-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject admin assignment when merchant profile does not exist', async () => {
      prisma.merchantProfile.findUnique.mockResolvedValue(null);

      await expect(
        demandService.assignMerchantNeighborhood(
          'non-existent-merchant-id',
          'neigh-indiranagar-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('6. Isolation & Zero IDOR in Merchant History', () => {
    it('should query demands strictly by authenticated merchant profile ID', async () => {
      prisma.missedDemand.findMany.mockResolvedValue([
        {
          id: 'demand-1',
          merchantId: 'merchant-profile-1',
          rawQuery: 'ragi atta',
          product: mockProductRagi,
          neighborhood: mockNeighborhood,
        },
      ]);
      prisma.missedDemand.count.mockResolvedValue(1);

      const result = await demandService.getMyDemands(mockMerchantUser as any, {});

      expect(prisma.missedDemand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchantId: 'merchant-profile-1' },
        }),
      );
      expect(result.data).toHaveLength(1);
    });
  });
});
