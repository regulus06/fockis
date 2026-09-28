import { PartialType } from "@nestjs/mapped-types";

import {
  CreateBusinessDealDto,
} from "./create-business-deal.dto";

export class UpdateBusinessDealDto
  extends PartialType(CreateBusinessDealDto) {}