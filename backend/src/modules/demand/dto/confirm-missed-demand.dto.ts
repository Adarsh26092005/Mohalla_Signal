import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmMissedDemandDto {
  @ApiProperty({
    description: 'Original customer request query',
    example: 'flour',
  })
  @IsNotEmpty({ message: 'query must not be empty' })
  @IsString()
  @MaxLength(200)
  query: string;

  @ApiProperty({
    description: 'Selected canonical product UUID confirmed by the merchant from candidate list',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @IsNotEmpty({ message: 'productId must not be empty' })
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId: string;

  @ApiPropertyOptional({
    description: 'Optional merchant internal note or customer context',
    example: 'Customer confirmed they specifically want Ragi Flour',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
