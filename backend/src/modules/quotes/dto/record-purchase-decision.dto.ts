import { IsNotEmpty, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseDecisionChoice } from '@prisma/client';

export class RecordPurchaseDecisionDto {
  @ApiProperty({
    description: 'Explicit purchase decision choice (must be BUY or DONT_BUY)',
    enum: PurchaseDecisionChoice,
    example: PurchaseDecisionChoice.BUY,
  })
  @IsNotEmpty({ message: 'decision is required' })
  @IsEnum(PurchaseDecisionChoice, {
    message: 'decision must be either BUY or DONT_BUY',
  })
  decision: PurchaseDecisionChoice;

  @ApiPropertyOptional({
    description: 'Optional internal merchant note explaining decision or terms',
    example: 'Accepted quote based on fast 2-day delivery window and pricing',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes cannot exceed 500 characters' })
  notes?: string;
}
