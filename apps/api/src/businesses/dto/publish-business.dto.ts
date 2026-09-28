import {
  IsBoolean,
} from "class-validator";

/* ============================================================================
   PUBLISH BUSINESS DTO
============================================================================ */

export class PublishBusinessDto {
  @IsBoolean()
  published!: boolean;
}