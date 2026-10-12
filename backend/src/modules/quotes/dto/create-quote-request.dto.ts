import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuoteRequestDto {
  @ApiProperty({
    description: 'Canonical Product UUID for the quote request',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'productId is required' })
  @IsUUID('4', { message: 'productId must be a valid UUID v4' })
  productId: string;

  @ApiProperty({
    description: 'Neighborhood UUID where the merchant shop is located',
    example: 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac270b22',
  })
  @IsNotEmpty({ message: 'neighborhoodId is required' })
  @IsUUID('4', { message: 'neighborhoodId must be a valid UUID v4' })
  neighborhoodId: string;

  @ApiProperty({
    description: 'Requested product quantity (positive integer units/packs)',
    example: 50,
    minimum: 1,
    maximum: 1000000,
  })
  @Type(() => Number)
  @IsInt({ message: 'requestedQuantity must be an integer' })
  @Min(1, { message: 'requestedQuantity must be at least 1' })
  @Max(1000000, { message: 'requestedQuantity cannot exceed 1,000,000' })
  requestedQuantity: number;

  @ApiPropertyOptional({
    description: 'Optional target supplier profile UUID if requesting a direct quote',
    example: 'c2ddde77-7a2b-4cd6-994b-4bb7bd160c33',
  })
  @IsOptional()
  @IsUUID('4', { message: 'targetSupplierId must be a valid UUID v4' })
  targetSupplierId?: string;

  @ApiPropertyOptional({
    description: 'Optional commercial notes or packaging specifications',
    example: 'Looking for 50x 1kg packets with minimum 6 months shelf life',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes cannot exceed 500 characters' })
  notes?: string;
}
