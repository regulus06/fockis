/**
 * update-organization.dto.ts
 * Payload for PATCH /organizations/:organizationId. Mirrors
 * web/src/features/church/types/church.types.ts -> UpdateOrganizationInput.
 */

import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganizationDto } from './create-organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
