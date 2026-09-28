import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class BackgroundRemovalDto {
  @ApiPropertyOptional({
    description: 'Background color to use after removing the original background.',
    example: '#ffffff',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'replacementColor must be a valid hex color such as #ffffff',
  })
  replacementColor?: string;

  @ApiPropertyOptional({
    description: 'Image URL to use as the replacement background.',
    example: 'https://example.com/background.jpg',
  })
  @IsOptional()
  @IsString()
  replacementImageUrl?: string;
}