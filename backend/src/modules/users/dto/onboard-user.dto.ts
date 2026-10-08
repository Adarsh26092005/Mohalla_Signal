import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateIf,
  NotEquals,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export enum OnboardingRole {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  SUPPLIER = 'SUPPLIER',
}

export class OnboardUserDto {
  @ApiProperty({
    enum: OnboardingRole,
    description: 'Target role for onboarding. ADMIN cannot be self-assigned.',
    example: OnboardingRole.MERCHANT,
  })
  @IsEnum(OnboardingRole, {
    message: 'Role must be one of CUSTOMER, MERCHANT, or SUPPLIER.',
  })
  @NotEquals(Role.ADMIN, {
    message: 'ADMIN role cannot be assigned through public onboarding.',
  })
  role: OnboardingRole;

  @ApiPropertyOptional({
    description: 'Display name / personal name',
    example: 'Adarsh Gupta',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  // Merchant Specific Fields
  @ApiPropertyOptional({
    description: 'Shop or Store name (Required for MERCHANT)',
    example: 'Gupta Kirana Store',
  })
  @ValidateIf((o) => o.role === OnboardingRole.MERCHANT)
  @IsNotEmpty({ message: 'shopName is required when onboarding as a MERCHANT' })
  @IsString()
  @MaxLength(150)
  shopName?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the shop (Required for MERCHANT)',
    example: 'Shop #4, Main Market, Sector 15',
  })
  @ValidateIf((o) => o.role === OnboardingRole.MERCHANT)
  @IsNotEmpty({ message: 'storeAddress is required when onboarding as a MERCHANT' })
  @IsString()
  @MaxLength(255)
  storeAddress?: string;

  @ApiPropertyOptional({
    description: '6-digit Postal PIN Code (Required for MERCHANT)',
    example: '110001',
  })
  @ValidateIf((o) => o.role === OnboardingRole.MERCHANT)
  @IsNotEmpty({ message: 'pincode is required when onboarding as a MERCHANT' })
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'pincode must be a valid 6-digit Indian PIN code' })
  pincode?: string;

  // Supplier Specific Fields
  @ApiPropertyOptional({
    description: 'Wholesale / Distribution Company Name (Required for SUPPLIER)',
    example: 'Shree Balaji FMCG Distributors',
  })
  @ValidateIf((o) => o.role === OnboardingRole.SUPPLIER)
  @IsNotEmpty({ message: 'companyName is required when onboarding as a SUPPLIER' })
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Primary contact person name for supplier orders',
    example: 'Rajesh Sharma',
  })
  @ValidateIf((o) => o.role === OnboardingRole.SUPPLIER)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'List of 6-digit postal PIN codes serviced by supplier',
    example: ['110001', '110002'],
    type: [String],
  })
  @ValidateIf((o) => o.role === OnboardingRole.SUPPLIER)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreaPincodes?: string[];
}
