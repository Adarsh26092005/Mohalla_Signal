import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMissedDemandDto {
  @ApiProperty({
    description: 'Raw product name or query requested by the customer (e.g. "ragi atta", "almond milk")',
    example: 'ragi atta',
  })
  @IsNotEmpty({ message: 'query must not be empty' })
  @IsString()
  @MaxLength(200)
  query: string;

  @ApiPropertyOptional({
    description: 'Optional merchant internal note or customer context (e.g. "Customer asked for 1kg packet")',
    example: 'Customer requested 1kg packet of organic ragi atta',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
