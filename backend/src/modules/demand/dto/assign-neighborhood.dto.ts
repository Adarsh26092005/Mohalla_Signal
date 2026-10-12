import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignNeighborhoodDto {
  @ApiProperty({
    description: 'Neighborhood UUID to assign to the merchant',
    example: 'd9b2d86a-7965-4f4c-bf6b-6f0a6d177bb3',
  })
  @IsNotEmpty({ message: 'neighborhoodId is required' })
  @IsUUID('4', { message: 'neighborhoodId must be a valid UUID' })
  neighborhoodId: string;
}
