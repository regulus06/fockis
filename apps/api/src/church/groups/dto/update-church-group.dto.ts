/**
 * update-church-group.dto.ts
 * Payload for PATCH /organizations/:organizationId/groups/:groupId. Mirrors
 * web/src/features/church/types/church.types.ts -> UpdateGroupInput.
 */

import { PartialType } from '@nestjs/mapped-types';
import { CreateChurchGroupDto } from './create-church-group.dto';

export class UpdateChurchGroupDto extends PartialType(CreateChurchGroupDto) {}
