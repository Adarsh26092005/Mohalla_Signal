import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Canonical product name',
    example: 'Ragi Flour',
  })
  @IsNotEmpty({ message: 'Product name must not be empty' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Category UUID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsNotEmpty({ message: 'categoryId must not be empty' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Optional product description',
    example: 'High fiber, organic finger millet flour',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional image URL for product display',
    example: 'https://images.unsplash.com/...',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Curated aliases for demand matching',
    example: ['ragi atta', 'finger millet flour', 'nachni flour'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  aliases?: string[];
}
