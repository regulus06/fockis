/**
 * update-media.dto.ts — PATCH /organizations/:organizationId/media/:mediaId
 */

import { PartialType } from "@nestjs/mapped-types";

import { CreateMediaDto } from "./create-media.dto";

export class UpdateMediaDto extends PartialType(CreateMediaDto) {}
