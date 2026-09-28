import {
  PartialType,
} from "@nestjs/mapped-types";

import {
  CreateContentPriceDto,
} from "./create-content-price.dto";

export class UpdateContentPriceDto extends PartialType(
  CreateContentPriceDto,
) {}