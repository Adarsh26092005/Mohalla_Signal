import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardUserDto, OnboardingRole } from './dto/onboard-user.dto';
import { Role } from '@prisma/client';
import { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds an existing application user by Firebase UID or creates a default CUSTOMER record
   * upon first verified authentication.
   */
  async findOrCreateFromFirebase(decodedToken: DecodedIdToken) {
    const { uid, email, phone_number, name } = decodedToken;

    let user = await this.prisma.user.findUnique({
      where: { firebaseUid: uid },
      include: {
        customerProfile: true,
        merchantProfile: true,
        supplierProfile: true,
      },
    });

    if (!user) {
      this.logger.log(`Creating new application user for Firebase UID: ${uid}`);
      user = await this.prisma.user.create({
        data: {
          firebaseUid: uid,
          email: email || null,
          phoneNumber: phone_number || null,
          displayName: name || null,
          role: Role.CUSTOMER,
          customerProfile: {
            create: {},
          },
        },
        include: {
          customerProfile: true,
          merchantProfile: true,
          supplierProfile: true,
        },
      });
    }

    return user;
  }

  /**
   * Finds application user by primary UUID
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        customerProfile: true,
        merchantProfile: true,
        supplierProfile: true,
      },
    });
  }

  /**
   * Returns safe profile details for the currently authenticated user
   */
  async getMe(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Application user not found');
    }

    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile:
        user.role === Role.MERCHANT
          ? user.merchantProfile
          : user.role === Role.SUPPLIER
            ? user.supplierProfile
            : user.customerProfile,
    };
  }

  /**
   * Complete onboarding and create role-specific profile (MERCHANT, SUPPLIER, or CUSTOMER).
   * Strictly prevents self-assignment of ADMIN role.
   */
  async onboard(userId: string, dto: OnboardUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        merchantProfile: true,
        supplierProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is inactive');
    }

    // Role escalation guard
    if ((dto.role as unknown) === Role.ADMIN) {
      throw new BadRequestException('ADMIN role cannot be assigned through public onboarding');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      // Update display name and role on User table
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          displayName: dto.displayName ?? user.displayName,
          role: dto.role as unknown as Role,
        },
      });

      // Handle role-specific profile creation / updates
      if (dto.role === OnboardingRole.MERCHANT) {
        if (!dto.shopName || !dto.storeAddress || !dto.pincode) {
          throw new BadRequestException(
            'shopName, storeAddress, and pincode are required for MERCHANT role',
          );
        }

        await tx.merchantProfile.upsert({
          where: { userId },
          create: {
            userId,
            shopName: dto.shopName,
            storeAddress: dto.storeAddress,
            pincode: dto.pincode,
          },
          update: {
            shopName: dto.shopName,
            storeAddress: dto.storeAddress,
            pincode: dto.pincode,
          },
        });
      } else if (dto.role === OnboardingRole.SUPPLIER) {
        if (!dto.companyName) {
          throw new BadRequestException('companyName is required for SUPPLIER role');
        }

        await tx.supplierProfile.upsert({
          where: { userId },
          create: {
            userId,
            companyName: dto.companyName,
            contactPerson: dto.contactPerson,
            serviceAreaPincodes: dto.serviceAreaPincodes || [],
          },
          update: {
            companyName: dto.companyName,
            contactPerson: dto.contactPerson,
            serviceAreaPincodes: dto.serviceAreaPincodes || [],
          },
        });
      } else if (dto.role === OnboardingRole.CUSTOMER) {
        await tx.customerProfile.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
      }

      return updated;
    });

    return this.getMe(updatedUser.id);
  }
}
