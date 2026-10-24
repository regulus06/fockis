import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateIf,
  type ValidationOptions,
} from "class-validator";

import {
  applyDecorators,
} from "@nestjs/common";


/* ============================================================================
   SHARED BUSINESS FIELD VALIDATION
============================================================================ */

/*
 * Only http and https destinations are accepted. This rejects javascript:,
 * data:, file: and other unsafe schemes before they are stored.
 */
export const SAFE_URL_OPTIONS = {
  protocols: ["http", "https"],
  require_protocol: true,
  require_valid_protocol: true,
};


/*
 * Optional http(s) URL.
 *
 * An empty string or null is accepted so an owner can clear the value on
 * update; the service converts those into "remove this field".
 */
export function IsOptionalHttpUrl(
  options?: ValidationOptions,
) {
  return applyDecorators(
    IsOptional(),
    ValidateIf(
      (_object, value) =>
        value !== "" &&
        value !== null &&
        value !== undefined,
    ),
    IsUrl(
      SAFE_URL_OPTIONS,
      {
        message:
          "must be a valid http:// or https:// URL",
        ...options,
      },
    ),
  );
}


/* ============================================================================
   OPENING HOURS ENTRY
============================================================================ */

const TIME_PATTERN =
  /^([01]\d|2[0-3]):[0-5]\d$/;

export class BusinessHoursEntryDto {

  @IsInt()
  @Min(0)
  @Max(6)
  day!: number;


  @IsOptional()
  @ValidateIf(
    (_object, value) =>
      value !== "",
  )
  @Matches(
    TIME_PATTERN,
    {
      message:
        "open must use the HH:mm 24-hour format",
    },
  )
  open?: string;


  @IsOptional()
  @ValidateIf(
    (_object, value) =>
      value !== "",
  )
  @Matches(
    TIME_PATTERN,
    {
      message:
        "close must use the HH:mm 24-hour format",
    },
  )
  close?: string;


  @IsBoolean()
  closed!: boolean;
}
