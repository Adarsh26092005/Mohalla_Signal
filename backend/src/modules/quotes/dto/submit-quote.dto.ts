import {
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitQuoteDto {
  @ApiProperty({
    description: 'Offered unit price in INR (must be positive Decimal amount)',
    example: 45.5,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'unitPrice must be a valid number with at most 2 decimal places' },
  )
  @Min(0.01, { message: 'unitPrice must be greater than 0' })
  unitPrice: number;

  @ApiProperty({
    description: 'Available quantity offered by the supplier (positive integer)',
    example: 100,
    minimum: 1,
    maximum: 1000000,
  })
  @Type(() => Number)
  @IsInt({ message: 'availableQuantity must be an integer' })
  @Min(1, { message: 'availableQuantity must be at least 1' })
  @Max(1000000, { message: 'availableQuantity cannot exceed 1,000,000' })
  availableQuantity: number;

  @ApiProperty({
    description: 'Estimated delivery timeline (e.g. "2 business days", "24 hours", "Same day")',
    example: '2 business days',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'estimatedDeliveryTime is required' })
  @IsString()
  @MaxLength(100, { message: 'estimatedDeliveryTime cannot exceed 100 characters' })
  estimatedDeliveryTime: string;

  @ApiProperty({
    description:
      'ISO-8601 date string until which this commercial quote remains valid (must be future timestamp)',
    example: '2026-11-01T12:00:00.000Z',
  })
  @IsNotEmpty({ message: 'validUntil is required' })
  @IsISO8601({}, { message: 'validUntil must be a valid ISO-8601 date string' })
  validUntil: string;

  @ApiPropertyOptional({
    description: 'Optional supplier notes or terms (e.g. minimum order batch, payment terms)',
    example: 'Free shipping on orders above INR 2000. Cash on delivery available.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes cannot exceed 500 characters' })
  notes?: string;
}
