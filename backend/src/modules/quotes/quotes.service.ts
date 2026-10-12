import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  User,
  Role,
  QuoteRequestStatus,
  QuoteStatus,
  PurchaseDecisionChoice,
  Prisma,
} from '@prisma/client';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { GetMyQuoteRequestsQueryDto } from './dto/get-my-quote-requests-query.dto';
import { GetAvailableQuoteRequestsQueryDto } from './dto/get-available-quote-requests-query.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';
import { RecordPurchaseDecisionDto } from './dto/record-purchase-decision.dto';
import { GetMyQuotesQueryDto } from './dto/get-my-quotes-query.dto';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  private readonly defaultThreshold: number;
  private readonly defaultRequestExpiryDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.defaultThreshold = this.configService.get<number>('demand.merchantThreshold', 3);
    this.defaultRequestExpiryDays = this.configService.get<number>('quotes.requestExpiryDays', 7);
  }

  /**
   * Helper: Resolves and validates the authenticated merchant profile and neighborhood.
   */
  private async getMerchantProfile(user: User) {
    if (user.role !== Role.MERCHANT) {
      throw new BadRequestException('User must have MERCHANT role to perform this action');
    }

    const merchantProfile = await this.prisma.merchantProfile.findUnique({
      where: { userId: user.id },
      include: { neighborhood: true },
    });

    if (!merchantProfile) {
      throw new BadRequestException(
        'Merchant profile not found for authenticated user. Please complete onboarding.',
      );
    }

    if (!merchantProfile.neighborhoodId || !merchantProfile.neighborhood) {
      throw new BadRequestException(
        'Merchant shop is not assigned to a verified neighborhood. Cannot create or access quotes.',
      );
    }

    return merchantProfile;
  }

  /**
   * Helper: Resolves and validates the authenticated supplier profile.
   */
  private async getSupplierProfile(user: User) {
    if (user.role !== Role.SUPPLIER) {
      throw new BadRequestException('User must have SUPPLIER role to perform this action');
    }

    const supplierProfile = await this.prisma.supplierProfile.findUnique({
      where: { userId: user.id },
    });

    if (!supplierProfile) {
      throw new BadRequestException(
        'Supplier profile not found for authenticated user. Please complete onboarding.',
      );
    }

    if (!supplierProfile.isVerified) {
      throw new ForbiddenException(
        'Supplier account is not verified. Only verified suppliers can access quote requests.',
      );
    }

    return supplierProfile;
  }

  /**
   * 1. Merchant creates a quote request for an eligible neighborhood demand signal.
   *
   * Validates:
   * - Merchant is assigned to the requested neighborhood.
   * - Canonical product exists and is active.
   * - Neighborhood exists.
   * - The demand signal meets the strict server-side privacy threshold (>= 3 distinct merchants).
   * - Optional target supplier exists and is verified.
   * - Server-side derived merchant identity and status (OPEN).
   */
  async createQuoteRequest(user: User, dto: CreateQuoteRequestDto) {
    const merchantProfile = await this.getMerchantProfile(user);

    // Validate that merchant shop is assigned to the requested neighborhood
    if (merchantProfile.neighborhoodId !== dto.neighborhoodId) {
      throw new BadRequestException(
        'Merchant can only request supplier quotes for their assigned neighborhood.',
      );
    }

    // Validate canonical product exists and is active
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || !product.isActive) {
      throw new BadRequestException('Selected product does not exist or is inactive.');
    }

    // Validate neighborhood exists
    const neighborhood = await this.prisma.neighborhood.findUnique({
      where: { id: dto.neighborhoodId },
    });
    if (!neighborhood) {
      throw new NotFoundException('Neighborhood not found.');
    }

    // Strict server-side demand signal eligibility validation:
    // Requires >= threshold distinct merchants in this neighborhood for this product.
    const demands = await this.prisma.missedDemand.findMany({
      where: {
        neighborhoodId: dto.neighborhoodId,
        productId: dto.productId,
      },
      select: { merchantId: true },
    });

    const distinctMerchants = new Set(demands.map((d) => d.merchantId));

    if (distinctMerchants.size < this.defaultThreshold) {
      this.logger.warn(
        `Rejected quote request creation: product ${product.id} in neighborhood ${neighborhood.id} has only ${distinctMerchants.size} distinct merchants (threshold: ${this.defaultThreshold})`,
      );
      throw new BadRequestException(
        `Demand signal for this product in this neighborhood has not met the privacy threshold (minimum ${this.defaultThreshold} distinct merchants). Quote requests can only be initiated for eligible neighborhood demand signals.`,
      );
    }

    // If target supplier is specified, validate supplier exists and is verified
    if (dto.targetSupplierId) {
      const targetSupplier = await this.prisma.supplierProfile.findUnique({
        where: { id: dto.targetSupplierId },
      });
      if (!targetSupplier) {
        throw new NotFoundException('Target supplier not found.');
      }
      if (!targetSupplier.isVerified) {
        throw new BadRequestException('Target supplier is not verified.');
      }
    }

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + this.defaultRequestExpiryDays * 24 * 60 * 60 * 1000);

    // Create quote request with server-derived identity and OPEN status
    const quoteRequest = await this.prisma.quoteRequest.create({
      data: {
        merchantId: merchantProfile.id,
        productId: product.id,
        neighborhoodId: neighborhood.id,
        targetSupplierId: dto.targetSupplierId || null,
        requestedQuantity: dto.requestedQuantity,
        status: QuoteRequestStatus.OPEN,
        notes: dto.notes?.trim() || null,
        expiresAt,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        neighborhood: {
          select: { id: true, name: true, city: true, pincode: true },
        },
      },
    });

    this.logger.log(
      `Quote request ${quoteRequest.id} created by merchant ${merchantProfile.id} for product ${product.name} (${dto.requestedQuantity} units) in ${neighborhood.name}`,
    );

    return {
      status: 'CREATED',
      message: 'Quote request successfully created for eligible neighborhood demand signal.',
      data: quoteRequest,
    };
  }

  /**
   * 2. Merchant retrieves their own quote requests and associated supplier responses.
   * Zero IDOR / cross-merchant exposure: strictly scoped to merchantProfile.id.
   */
  async getMyQuoteRequests(user: User, query: GetMyQuoteRequestsQueryDto) {
    const merchantProfile = await this.getMerchantProfile(user);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteRequestWhereInput = {
      merchantId: merchantProfile.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, requests] = await Promise.all([
      this.prisma.quoteRequest.count({ where }),
      this.prisma.quoteRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          neighborhood: {
            select: { id: true, name: true, city: true, pincode: true },
          },
          quotes: {
            orderBy: { createdAt: 'asc' },
            include: {
              supplier: {
                select: { id: true, companyName: true },
              },
              purchaseDecisions: {
                where: { merchantId: merchantProfile.id },
                select: { id: true, decision: true, decisionDate: true, notes: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: requests,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 3. Merchant retrieves details for a single quote request they own.
   */
  async getQuoteRequestById(user: User, id: string) {
    const merchantProfile = await this.getMerchantProfile(user);

    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        neighborhood: {
          select: { id: true, name: true, city: true, pincode: true },
        },
        quotes: {
          orderBy: { createdAt: 'asc' },
          include: {
            supplier: {
              select: { id: true, companyName: true },
            },
            purchaseDecisions: {
              where: { merchantId: merchantProfile.id },
              select: { id: true, decision: true, decisionDate: true, notes: true },
            },
          },
        },
      },
    });

    if (!quoteRequest) {
      throw new NotFoundException('Quote request not found.');
    }

    if (quoteRequest.merchantId !== merchantProfile.id) {
      throw new ForbiddenException('You do not have access to this quote request.');
    }

    return quoteRequest;
  }

  /**
   * 4. Authorized supplier retrieves quote requests relevant to their supply capability.
   *
   * Privacy Invariants:
   * - Never exposes requesting merchant identity, shop name, or address.
   * - Never exposes contributing merchants or private demand counters.
   * - Filters by OPEN status, unexpired timestamps, target supplier compatibility,
   *   and supplier's service area PIN codes.
   */
  async getAvailableQuoteRequests(user: User, query: GetAvailableQuoteRequestsQueryDto) {
    const supplierProfile = await this.getSupplierProfile(user);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const now = new Date();

    const where: Prisma.QuoteRequestWhereInput = {
      status: { in: [QuoteRequestStatus.OPEN, QuoteRequestStatus.QUOTED] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [{ targetSupplierId: null }, { targetSupplierId: supplierProfile.id }],
        },
      ],
    };

    // Filter by supplier service area pincodes if declared
    if (supplierProfile.serviceAreaPincodes && supplierProfile.serviceAreaPincodes.length > 0) {
      where.neighborhood = {
        pincode: { in: supplierProfile.serviceAreaPincodes },
      };
    }

    const [total, requests] = await Promise.all([
      this.prisma.quoteRequest.count({ where }),
      this.prisma.quoteRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          requestedQuantity: true,
          status: true,
          notes: true,
          expiresAt: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          neighborhood: {
            select: {
              id: true,
              name: true,
              city: true,
              pincode: true,
            },
          },
          quotes: {
            where: { supplierId: supplierProfile.id },
            select: {
              id: true,
              unitPrice: true,
              availableQuantity: true,
              estimatedDeliveryTime: true,
              validUntil: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    // Format privacy-preserving feed for supplier
    const data = requests.map((req) => ({
      id: req.id,
      product: req.product,
      neighborhood: req.neighborhood,
      requestedQuantity: req.requestedQuantity,
      notes: req.notes,
      status: req.status,
      expiresAt: req.expiresAt,
      createdAt: req.createdAt,
      hasSubmittedQuote: req.quotes.length > 0,
      myQuote: req.quotes[0] || null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 5. Supplier submits commercial quote for a quote request.
   *
   * Validates:
   * - Supplier is verified.
   * - Quote request exists and is OPEN / QUOTED (not CLOSED, CANCELLED, or EXPIRED).
   * - Supplier has capability (neighborhood pincode in serviceAreaPincodes, targetSupplier check).
   * - Positive unitPrice and quantity.
   * - validUntil is a future timestamp.
   * - No unauthorized modification of another supplier's quote.
   */
  async submitQuote(user: User, requestId: string, dto: SubmitQuoteDto) {
    const supplierProfile = await this.getSupplierProfile(user);

    // Validate validUntil date is strictly in the future
    const validUntil = new Date(dto.validUntil);
    if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
      throw new BadRequestException('Quote validity date (validUntil) must be a future timestamp.');
    }

    if (dto.unitPrice <= 0) {
      throw new BadRequestException('Unit price must be greater than zero.');
    }

    if (dto.availableQuantity <= 0) {
      throw new BadRequestException('Available quantity must be greater than zero.');
    }

    const quoteRequest = await this.prisma.quoteRequest.findUnique({
      where: { id: requestId },
      include: { neighborhood: true },
    });

    if (!quoteRequest) {
      throw new NotFoundException('Quote request not found.');
    }

    if (
      quoteRequest.status === QuoteRequestStatus.CLOSED ||
      quoteRequest.status === QuoteRequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot submit quote: Quote request is ${quoteRequest.status}.`,
      );
    }

    if (quoteRequest.expiresAt && quoteRequest.expiresAt <= new Date()) {
      throw new BadRequestException('Cannot submit quote: Quote request has expired.');
    }

    // Check targeting
    if (quoteRequest.targetSupplierId && quoteRequest.targetSupplierId !== supplierProfile.id) {
      throw new ForbiddenException(
        'This quote request was targeted specifically to another supplier.',
      );
    }

    // Check service area PIN code compatibility
    if (
      supplierProfile.serviceAreaPincodes &&
      supplierProfile.serviceAreaPincodes.length > 0 &&
      !supplierProfile.serviceAreaPincodes.includes(quoteRequest.neighborhood.pincode)
    ) {
      throw new ForbiddenException('Neighborhood PIN code is outside your declared service area.');
    }

    // Check if supplier already submitted a quote for this request
    const existingQuote = await this.prisma.supplierQuote.findUnique({
      where: {
        quoteRequestId_supplierId: {
          quoteRequestId: quoteRequest.id,
          supplierId: supplierProfile.id,
        },
      },
    });

    if (existingQuote) {
      // Prevent modification of quotes that have already been finalized
      if (existingQuote.status !== QuoteStatus.PENDING) {
        throw new BadRequestException(
          `Cannot modify quote: Quote is already ${existingQuote.status}.`,
        );
      }

      // Update existing quote
      const updatedQuote = await this.prisma.supplierQuote.update({
        where: { id: existingQuote.id },
        data: {
          unitPrice: new Prisma.Decimal(dto.unitPrice),
          availableQuantity: dto.availableQuantity,
          estimatedDeliveryTime: dto.estimatedDeliveryTime.trim(),
          validUntil,
          notes: dto.notes?.trim() || null,
        },
      });

      this.logger.log(
        `Supplier ${supplierProfile.id} updated quote ${updatedQuote.id} for request ${quoteRequest.id}`,
      );

      return {
        status: 'UPDATED',
        message: 'Supplier quote successfully updated.',
        data: updatedQuote,
      };
    }

    // Create new supplier quote and transition request to QUOTED if OPEN
    return await this.prisma.$transaction(async (tx) => {
      const quote = await tx.supplierQuote.create({
        data: {
          quoteRequestId: quoteRequest.id,
          supplierId: supplierProfile.id,
          unitPrice: new Prisma.Decimal(dto.unitPrice),
          availableQuantity: dto.availableQuantity,
          estimatedDeliveryTime: dto.estimatedDeliveryTime.trim(),
          validUntil,
          notes: dto.notes?.trim() || null,
          status: QuoteStatus.PENDING,
        },
      });

      if (quoteRequest.status === QuoteRequestStatus.OPEN) {
        await tx.quoteRequest.update({
          where: { id: quoteRequest.id },
          data: { status: QuoteRequestStatus.QUOTED },
        });
      }

      this.logger.log(
        `Supplier ${supplierProfile.id} submitted new quote ${quote.id} for request ${quoteRequest.id}`,
      );

      return {
        status: 'CREATED',
        message: 'Commercial quote successfully submitted.',
        data: quote,
      };
    });
  }

  /**
   * 6. Supplier views their own submitted quotes.
   * Scoped to authenticated supplier: no leakage of competing quotes or other merchants' decisions.
   */
  async getMyQuotes(user: User, query: GetMyQuotesQueryDto) {
    const supplierProfile = await this.getSupplierProfile(user);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierQuoteWhereInput = {
      supplierId: supplierProfile.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, quotes] = await Promise.all([
      this.prisma.supplierQuote.count({ where }),
      this.prisma.supplierQuote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          quoteRequest: {
            select: {
              id: true,
              requestedQuantity: true,
              status: true,
              expiresAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  category: { select: { id: true, name: true, slug: true } },
                },
              },
              neighborhood: {
                select: { id: true, name: true, city: true, pincode: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: quotes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 7. Merchant records BUY / DON'T BUY decision.
   *
   * Requirements:
   * - Accept only explicit BUY or DONT_BUY.
   * - Derive merchant identity server-side.
   * - Prevent a merchant from deciding on another merchant's quote request (Zero IDOR).
   * - Validate quote validity/expiry and request status.
   * - Predictable repeat submissions: Idempotent return if decision is identical.
   * - Prevent invalid state transitions (e.g. BUY -> DONT_BUY once finalized).
   * - Record decision timestamp and merchant note.
   * - Records purchase intent/decision only; no inventory or fulfillment mutation.
   */
  async recordPurchaseDecision(user: User, quoteId: string, dto: RecordPurchaseDecisionDto) {
    const merchantProfile = await this.getMerchantProfile(user);

    const quote = await this.prisma.supplierQuote.findUnique({
      where: { id: quoteId },
      include: {
        quoteRequest: true,
        purchaseDecisions: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Supplier quote not found.');
    }

    // Ownership check: quote request must belong exclusively to this merchant
    if (quote.quoteRequest.merchantId !== merchantProfile.id) {
      throw new ForbiddenException(
        'You are not authorized to decide on a quote for another merchant’s quote request.',
      );
    }

    // Validate quote expiry
    if (quote.validUntil <= new Date()) {
      throw new BadRequestException('Cannot decide on an expired quote.');
    }

    // Validate quote request status
    if (
      quote.quoteRequest.status === QuoteRequestStatus.CLOSED ||
      quote.quoteRequest.status === QuoteRequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot decide on quote: Quote request is ${quote.quoteRequest.status}.`,
      );
    }

    // Check existing decision by this merchant for this quote
    const existingDecision = quote.purchaseDecisions.find(
      (d) => d.merchantId === merchantProfile.id,
    );

    if (existingDecision) {
      if (existingDecision.decision === dto.decision) {
        // Repeat identical submission: predictable idempotent response
        this.logger.log(
          `Repeat identical purchase decision (${dto.decision}) received for quote ${quote.id} by merchant ${merchantProfile.id}. Returning existing decision idempotently.`,
        );

        return {
          status: 'RECORDED',
          message: 'Purchase decision already recorded.',
          decision: existingDecision.decision,
          decisionId: existingDecision.id,
          quoteId: quote.id,
          decisionDate: existingDecision.decisionDate,
          notice:
            'Decision recorded. Inventory mutation and order fulfillment are not triggered in this phase.',
        };
      } else {
        // Invalid state transition: decision cannot be flipped once submitted
        this.logger.warn(
          `Rejected invalid decision transition from ${existingDecision.decision} to ${dto.decision} for quote ${quote.id}`,
        );
        throw new BadRequestException(
          `Purchase decision already finalized as ${existingDecision.decision}. Changing decision from ${existingDecision.decision} to ${dto.decision} is not permitted.`,
        );
      }
    }

    // Process decision atomically in transaction
    return await this.prisma.$transaction(async (tx) => {
      const decision = await tx.purchaseDecision.create({
        data: {
          quoteId: quote.id,
          merchantId: merchantProfile.id,
          decision: dto.decision,
          notes: dto.notes?.trim() || null,
          decisionDate: new Date(),
        },
      });

      const nextQuoteStatus =
        dto.decision === PurchaseDecisionChoice.BUY ? QuoteStatus.ACCEPTED : QuoteStatus.REJECTED;

      await tx.supplierQuote.update({
        where: { id: quote.id },
        data: { status: nextQuoteStatus },
      });

      this.logger.log(
        `Purchase decision ${dto.decision} recorded (ID: ${decision.id}) for quote ${quote.id} by merchant ${merchantProfile.id}`,
      );

      return {
        status: 'RECORDED',
        message: 'Purchase decision successfully recorded.',
        decision: decision.decision,
        decisionId: decision.id,
        quoteId: quote.id,
        decisionDate: decision.decisionDate,
        notice:
          'Decision recorded. Inventory mutation and order fulfillment are not triggered in this phase.',
      };
    });
  }
}
