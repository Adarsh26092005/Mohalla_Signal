import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetDemandSignalsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter signals by Neighborhood UUID',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @IsOptional()
  @IsString()
  neighborhoodId?: string;

  @ApiPropertyOptional({
    description: 'Filter signals by Neighborhood slug (e.g. "indiranagar")',
    example: 'indiranagar',
  })
  @IsOptional()
  @IsString()
  neighborhoodSlug?: string;

  @ApiPropertyOptional({
    description: 'Filter signals by Category UUID',
    example: 'c1f7a08b-6df6-48c9-bcde-2e88b63a241f',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter signals by Category slug (e.g. "flours-grains")',
    example: 'flours-grains',
  })
  @IsOptional()
  @IsString()
  categorySlug?: string;
}
