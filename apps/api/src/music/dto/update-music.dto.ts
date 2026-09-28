import { PartialType, OmitType } from '@nestjs/mapped-types';

import { CreateMusicDto } from './create-music.dto';

/**
 * Producer-editable fields only.
 *
 * Server-calculated ranking/financial metrics are intentionally not part
 * of CreateMusicDto and therefore cannot be updated through this DTO.
 */
export class UpdateMusicDto extends PartialType(
  OmitType(CreateMusicDto, ['mediaStorageKey'] as const),
) {}