/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, QuoteRequestStatus, QuoteStatus, PurchaseDecisionChoice } from '@prisma/client';

describe('QuotesService (Phase 5: Supplier Quotes & Purchase Decisions)', () => {
  let quotesService: QuotesService;
  let prisma: any;

  const mockMerchantUser = {
    id: 'user-merchant-uuid-1',
    firebaseUid: 'firebase-uid-merchant-1',
    role: Role.MERCHANT,
    isActive: true,
  };

  const mockOtherMerchantUser = {
    id: 'user-merchant-uuid-2',
    firebaseUid: 'firebase-uid-merchant-2',
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

  const mockOtherSupplierUser = {
    id: 'user-supplier-uuid-2',
    firebaseUid: 'firebase-uid-supplier-2',
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
    id: 'merchant-profile-uuid-1',
    userId: 'user-merchant-uuid-1',
    shopName: 'Shri Ram Kirana Store',
    storeAddress: '100ft Road, Indiranagar',
    pincode: '560038',
    neighborhoodId: 'neigh-indiranagar-uuid',
    neighborhood: mockNeighborhood,
    isVerified: true,
  };

  const mockOtherMerchantProfile = {
    id: 'merchant-profile-uuid-2',
    userId: 'user-merchant-uuid-2',
    shopName: 'Gupta Traders',
    storeAddress: '12th Main, Indiranagar',
    pincode: '560038',
    neighborhoodId: 'neigh-indiranagar-uuid',
    neighborhood: mockNeighborhood,
    isVerified: true,
  };

  const mockSupplierProfile = {
    id: 'supplier-profile-uuid-1',
    userId: 'user-supplier-uuid-1',
    companyName: 'Karnataka Grain Distributors',
    contactPerson: 'Ramesh Kumar',
    serviceAreaPincodes: ['560038', '560008'],
    isVerified: true,
  };

  const mockOtherSupplierProfile = {
    id: 'supplier-profile-uuid-2',
    userId: 'user-supplier-uuid-2',
    companyName: 'Apex Wholesale Mart',
    contactPerson: 'Suresh Patel',
    serviceAreaPincodes: ['560038'],
    isVerified: true,
  };

  const mockUnverifiedSupplierProfile = {
    id: 'supplier-profile-uuid-unverified',
    userId: 'user-supplier-uuid-1',
    companyName: 'Unverified Supplies Ltd',
    contactPerson: 'Pending Review',
    serviceAreaPincodes: ['560038'],
    isVerified: false,
  };

  const mockProduct = {
    id: 'prod-ragi-uuid',
    name: 'Ragi Flour 1kg',
    normalizedName: 'ragi flour 1kg',
    categoryId: 'cat-flours-uuid',
    isActive: true,
    category: {
      id: 'cat-flours-uuid',
      name: 'Flours & Grains',
      slug: 'flours-grains',
    },
  };

  const mockQuoteRequest = {
    id: 'quote-req-uuid-1',
    merchantId: 'merchant-profile-uuid-1',
    productId: 'prod-ragi-uuid',
    neighborhoodId: 'neigh-indiranagar-uuid',
    targetSupplierId: null,
    requestedQuantity: 50,
    status: QuoteRequestStatus.OPEN,
    notes: 'Need 50 packets of 1kg',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
    neighborhood: mockNeighborhood,
    quotes: [],
  };

  const mockFutureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const mockPastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(async () => {
    prisma = {
      merchantProfile: {
        findUnique: jest.fn().mockResolvedValue(mockMerchantProfile),
      },
      supplierProfile: {
        findUnique: jest.fn().mockResolvedValue(mockSupplierProfile),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue(mockProduct),
      },
      neighborhood: {
        findUnique: jest.fn().mockResolvedValue(mockNeighborhood),
      },
      missedDemand: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ merchantId: 'm1' }, { merchantId: 'm2' }, { merchantId: 'm3' }]),
      },
      quoteRequest: {
        create: jest.fn().mockResolvedValue(mockQuoteRequest),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockQuoteRequest]),
        findUnique: jest.fn().mockResolvedValue(mockQuoteRequest),
        update: jest.fn().mockResolvedValue(mockQuoteRequest),
      },
      supplierQuote: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      purchaseDecision: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'demand.merchantThreshold') return 3;
              if (key === 'quotes.requestExpiryDays') return 7;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    quotesService = module.get<QuotesService>(QuotesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Merchant Quote Request Creation', () => {
    it('should create a valid quote request when neighborhood demand meets privacy threshold', async () => {
      const result = await quotesService.createQuoteRequest(mockMerchantUser as any, {
        productId: 'prod-ragi-uuid',
        neighborhoodId: 'neigh-indiranagar-uuid',
        requestedQuantity: 50,
        notes: 'Fresh stock preferred',
      });

      expect(result.status).toBe('CREATED');
      expect(prisma.quoteRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            merchantId: 'merchant-profile-uuid-1',
            productId: 'prod-ragi-uuid',
            neighborhoodId: 'neigh-indiranagar-uuid',
            requestedQuantity: 50,
            status: QuoteRequestStatus.OPEN,
          }),
        }),
      );
    });

    it('should reject customer attempting to create merchant quote request', async () => {
      await expect(
        quotesService.createQuoteRequest(mockCustomerUser as any, {
          productId: 'prod-ragi-uuid',
          neighborhoodId: 'neigh-indiranagar-uuid',
          requestedQuantity: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject quote request when demand signal does not meet privacy threshold (< 3 distinct merchants)', async () => {
      // Only 2 distinct merchants
      prisma.missedDemand.findMany.mockResolvedValue([
        { merchantId: 'm1' },
        { merchantId: 'm1' },
        { merchantId: 'm2' },
      ]);

      await expect(
        quotesService.createQuoteRequest(mockMerchantUser as any, {
          productId: 'prod-ragi-uuid',
          neighborhoodId: 'neigh-indiranagar-uuid',
          requestedQuantity: 50,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.quoteRequest.create).not.toHaveBeenCalled();
    });

    it('should reject quote request if merchant shop is not assigned to the requested neighborhood', async () => {
      await expect(
        quotesService.createQuoteRequest(mockMerchantUser as any, {
          productId: 'prod-ragi-uuid',
          neighborhoodId: 'other-neighborhood-uuid',
          requestedQuantity: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject inactive or non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        quotesService.createQuoteRequest(mockMerchantUser as any, {
          productId: 'non-existent-product',
          neighborhoodId: 'neigh-indiranagar-uuid',
          requestedQuantity: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should derive merchant identity server-side and ignore forged merchant IDs', async () => {
      const forgedDto = {
        productId: 'prod-ragi-uuid',
        neighborhoodId: 'neigh-indiranagar-uuid',
        requestedQuantity: 50,
        merchantId: 'forged-merchant-id', // Mass assignment attempt
      };

      await quotesService.createQuoteRequest(mockMerchantUser as any, forgedDto as any);

      expect(prisma.quoteRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            merchantId: 'merchant-profile-uuid-1', // Strictly server-derived
          }),
        }),
      );
    });
  });

  describe('2. Multi-Merchant Isolation & Anti-IDOR', () => {
    it('should allow merchant to view their own quote requests', async () => {
      const result = await quotesService.getMyQuoteRequests(mockMerchantUser as any, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(prisma.quoteRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchantId: 'merchant-profile-uuid-1' },
        }),
      );
    });

    it('should prevent merchant from accessing another merchant’s quote request', async () => {
      // Mock other merchant requesting request owned by merchant 1
      prisma.merchantProfile.findUnique.mockResolvedValue(mockOtherMerchantProfile);

      await expect(
        quotesService.getQuoteRequestById(mockOtherMerchantUser as any, 'quote-req-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Supplier Quote Workflow', () => {
    it('should allow verified supplier with matching service area to submit a quote', async () => {
      const mockCreatedQuote = {
        id: 'quote-uuid-1',
        quoteRequestId: 'quote-req-uuid-1',
        supplierId: 'supplier-profile-uuid-1',
        unitPrice: 42.5,
        availableQuantity: 100,
        estimatedDeliveryTime: '2 days',
        validUntil: new Date(mockFutureDate),
        status: QuoteStatus.PENDING,
      };

      prisma.supplierQuote.create.mockResolvedValue(mockCreatedQuote);

      const result = await quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
        unitPrice: 42.5,
        availableQuantity: 100,
        estimatedDeliveryTime: '2 business days',
        validUntil: mockFutureDate,
        notes: 'Standard Kirana wholesale pricing',
      });

      expect(result.status).toBe('CREATED');
      expect(prisma.supplierQuote.create).toHaveBeenCalled();
      expect(prisma.quoteRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: QuoteRequestStatus.QUOTED },
        }),
      );
    });

    it('should reject unverified supplier from accessing or submitting quotes', async () => {
      prisma.supplierProfile.findUnique.mockResolvedValue(mockUnverifiedSupplierProfile);

      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 42.5,
          availableQuantity: 100,
          estimatedDeliveryTime: '2 business days',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject past expiry dates for supplier quotes', async () => {
      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 42.5,
          availableQuantity: 100,
          estimatedDeliveryTime: '2 business days',
          validUntil: mockPastDate, // Expired date
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-positive unit prices or quantities', async () => {
      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 0,
          availableQuantity: 100,
          estimatedDeliveryTime: '2 days',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 50,
          availableQuantity: 0,
          estimatedDeliveryTime: '2 days',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject quotes for expired quote requests', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...mockQuoteRequest,
        expiresAt: new Date(Date.now() - 10000), // Request expired
      });

      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 45,
          availableQuantity: 50,
          estimatedDeliveryTime: '2 days',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject quotes for closed or cancelled quote requests', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...mockQuoteRequest,
        status: QuoteRequestStatus.CLOSED,
      });

      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 45,
          availableQuantity: 50,
          estimatedDeliveryTime: '2 days',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject quote if supplier service area does not cover neighborhood pincode', async () => {
      prisma.supplierProfile.findUnique.mockResolvedValue({
        ...mockSupplierProfile,
        serviceAreaPincodes: ['560001', '560002'], // Does not cover 560038
      });

      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 45,
          availableQuantity: 50,
          estimatedDeliveryTime: '2 days',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject supplier quoting on request targeted to a different supplier', async () => {
      prisma.quoteRequest.findUnique.mockResolvedValue({
        ...mockQuoteRequest,
        targetSupplierId: 'supplier-profile-uuid-2', // Targeted to other supplier
      });

      await expect(
        quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 45,
          availableQuantity: 50,
          estimatedDeliveryTime: '2 days',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update existing PENDING quote if the same supplier submits again', async () => {
      const mockExistingQuote = {
        id: 'quote-uuid-existing',
        quoteRequestId: 'quote-req-uuid-1',
        supplierId: 'supplier-profile-uuid-1',
        unitPrice: 50,
        availableQuantity: 80,
        estimatedDeliveryTime: '3 days',
        validUntil: new Date(mockFutureDate),
        status: QuoteStatus.PENDING,
      };

      prisma.supplierQuote.findUnique.mockResolvedValue(mockExistingQuote);
      prisma.supplierQuote.update.mockResolvedValue({
        ...mockExistingQuote,
        unitPrice: 45,
      });

      const result = await quotesService.submitQuote(mockSupplierUser as any, 'quote-req-uuid-1', {
        unitPrice: 45,
        availableQuantity: 80,
        estimatedDeliveryTime: '2 days',
        validUntil: mockFutureDate,
      });

      expect(result.status).toBe('UPDATED');
      expect(prisma.supplierQuote.update).toHaveBeenCalled();
    });

    it('should prevent supplier from modifying another supplier’s quote', async () => {
      // Mock existing quote belonging to Supplier 1, but Supplier 2 tries to submit
      prisma.supplierProfile.findUnique.mockResolvedValue(mockOtherSupplierProfile);
      prisma.supplierQuote.findUnique.mockResolvedValue({
        id: 'quote-uuid-supplier-1',
        quoteRequestId: 'quote-req-uuid-1',
        supplierId: 'supplier-profile-uuid-1', // Belongs to supplier 1
        status: QuoteStatus.ACCEPTED,
      });

      await expect(
        quotesService.submitQuote(mockOtherSupplierUser as any, 'quote-req-uuid-1', {
          unitPrice: 40,
          availableQuantity: 100,
          estimatedDeliveryTime: '1 day',
          validUntil: mockFutureDate,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Merchant BUY / DON’T BUY Decision', () => {
    const mockQuoteForDecision = {
      id: 'quote-uuid-for-decision',
      quoteRequestId: 'quote-req-uuid-1',
      supplierId: 'supplier-profile-uuid-1',
      unitPrice: 45,
      availableQuantity: 50,
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Valid for 3 days
      status: QuoteStatus.PENDING,
      quoteRequest: {
        id: 'quote-req-uuid-1',
        merchantId: 'merchant-profile-uuid-1',
        status: QuoteRequestStatus.QUOTED,
      },
      purchaseDecisions: [],
    };

    it('should successfully record an explicit BUY decision by authorized merchant', async () => {
      prisma.supplierQuote.findUnique.mockResolvedValue(mockQuoteForDecision);
      prisma.purchaseDecision.create.mockResolvedValue({
        id: 'decision-uuid-1',
        quoteId: 'quote-uuid-for-decision',
        merchantId: 'merchant-profile-uuid-1',
        decision: PurchaseDecisionChoice.BUY,
        decisionDate: new Date(),
      });

      const result = await quotesService.recordPurchaseDecision(
        mockMerchantUser as any,
        'quote-uuid-for-decision',
        {
          decision: PurchaseDecisionChoice.BUY,
          notes: 'Accepted order terms',
        },
      );

      expect(result.status).toBe('RECORDED');
      expect(result.decision).toBe('BUY');
      expect(prisma.purchaseDecision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decision: PurchaseDecisionChoice.BUY,
            merchantId: 'merchant-profile-uuid-1',
          }),
        }),
      );
      expect(prisma.supplierQuote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quote-uuid-for-decision' },
          data: { status: QuoteStatus.ACCEPTED },
        }),
      );
    });

    it('should successfully record an explicit DONT_BUY decision by authorized merchant', async () => {
      prisma.supplierQuote.findUnique.mockResolvedValue(mockQuoteForDecision);
      prisma.purchaseDecision.create.mockResolvedValue({
        id: 'decision-uuid-2',
        quoteId: 'quote-uuid-for-decision',
        merchantId: 'merchant-profile-uuid-1',
        decision: PurchaseDecisionChoice.DONT_BUY,
        decisionDate: new Date(),
      });

      const result = await quotesService.recordPurchaseDecision(
        mockMerchantUser as any,
        'quote-uuid-for-decision',
        {
          decision: PurchaseDecisionChoice.DONT_BUY,
          notes: 'Price too high',
        },
      );

      expect(result.status).toBe('RECORDED');
      expect(result.decision).toBe('DONT_BUY');
      expect(prisma.supplierQuote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quote-uuid-for-decision' },
          data: { status: QuoteStatus.REJECTED },
        }),
      );
    });

    it('should reject merchant attempting to decide on another merchant’s quote request', async () => {
      prisma.merchantProfile.findUnique.mockResolvedValue(mockOtherMerchantProfile);
      prisma.supplierQuote.findUnique.mockResolvedValue(mockQuoteForDecision);

      await expect(
        quotesService.recordPurchaseDecision(
          mockOtherMerchantUser as any,
          'quote-uuid-for-decision',
          {
            decision: PurchaseDecisionChoice.BUY,
          },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.purchaseDecision.create).not.toHaveBeenCalled();
    });

    it('should reject decision on an expired quote', async () => {
      prisma.supplierQuote.findUnique.mockResolvedValue({
        ...mockQuoteForDecision,
        validUntil: new Date(Date.now() - 5000), // Expired
      });

      await expect(
        quotesService.recordPurchaseDecision(mockMerchantUser as any, 'quote-uuid-for-decision', {
          decision: PurchaseDecisionChoice.BUY,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle repeated identical decisions idempotently and predictably', async () => {
      const existingDate = new Date();
      prisma.supplierQuote.findUnique.mockResolvedValue({
        ...mockQuoteForDecision,
        purchaseDecisions: [
          {
            id: 'decision-uuid-existing',
            merchantId: 'merchant-profile-uuid-1',
            decision: PurchaseDecisionChoice.BUY,
            decisionDate: existingDate,
          },
        ],
      });

      const result = await quotesService.recordPurchaseDecision(
        mockMerchantUser as any,
        'quote-uuid-for-decision',
        {
          decision: PurchaseDecisionChoice.BUY, // Identical repeat decision
        },
      );

      expect(result.status).toBe('RECORDED');
      expect(result.message).toBe('Purchase decision already recorded.');
      expect(result.decisionId).toBe('decision-uuid-existing');
      // No duplicate insert
      expect(prisma.purchaseDecision.create).not.toHaveBeenCalled();
    });

    it('should reject invalid state transitions (changing BUY to DONT_BUY once finalized)', async () => {
      prisma.supplierQuote.findUnique.mockResolvedValue({
        ...mockQuoteForDecision,
        purchaseDecisions: [
          {
            id: 'decision-uuid-existing',
            merchantId: 'merchant-profile-uuid-1',
            decision: PurchaseDecisionChoice.BUY, // Already decided BUY
            decisionDate: new Date(),
          },
        ],
      });

      await expect(
        quotesService.recordPurchaseDecision(mockMerchantUser as any, 'quote-uuid-for-decision', {
          decision: PurchaseDecisionChoice.DONT_BUY, // Attempt to flip to DONT_BUY
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.purchaseDecision.create).not.toHaveBeenCalled();
    });
  });

  describe('5. Privacy Protections in Supplier Feed', () => {
    it('should not leak merchant identity, shop address, or private demand counters to suppliers', async () => {
      prisma.quoteRequest.findMany.mockResolvedValue([
        {
          id: 'quote-req-uuid-1',
          requestedQuantity: 50,
          status: QuoteRequestStatus.OPEN,
          notes: 'Standard Kirana batch',
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          product: mockProduct,
          neighborhood: mockNeighborhood,
          quotes: [],
        },
      ]);

      const result = await quotesService.getAvailableQuoteRequests(mockSupplierUser as any, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      const item = result.data[0];
      // Verify no merchant identity fields exist
      expect((item as any).merchantId).toBeUndefined();
      expect((item as any).merchant).toBeUndefined();
      expect((item as any).shopName).toBeUndefined();
      expect((item as any).storeAddress).toBeUndefined();
      expect(item.neighborhood.name).toBe('Indiranagar');
      expect(item.product.name).toBe('Ragi Flour 1kg');
    });
  });
});
