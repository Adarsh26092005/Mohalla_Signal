import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { OnboardingRole } from './dto/onboard-user.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService (Isolated Unit Tests)', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-uuid-1',
    firebaseUid: 'firebase-uid-1',
    email: 'test@example.com',
    phoneNumber: '+919876543210',
    displayName: 'Test User',
    role: Role.CUSTOMER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    customerProfile: {
      id: 'cp-1',
      userId: 'user-uuid-1',
      address: null,
      pincode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    merchantProfile: null,
    supplierProfile: null,
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      merchantProfile: {
        upsert: jest.fn(),
      },
      supplierProfile: {
        upsert: jest.fn(),
      },
      customerProfile: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: any) => Promise<any>) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getMe', () => {
    it('should return safe user profile without secrets', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getMe('user-uuid-1');
      expect(result).toHaveProperty('id', 'user-uuid-1');
      expect(result).toHaveProperty('firebaseUid', 'firebase-uid-1');
      expect(result).toHaveProperty('role', Role.CUSTOMER);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('onboard', () => {
    it('should throw BadRequestException if trying to onboard as ADMIN', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.onboard('user-uuid-1', {
          role: Role.ADMIN as unknown as OnboardingRole,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require shopName, storeAddress and pincode for MERCHANT onboarding', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.onboard('user-uuid-1', {
          role: OnboardingRole.MERCHANT,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
