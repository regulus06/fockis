/**
 * update-event.dto.ts
 * Payload for PATCH /organizations/:organizationId/events/:eventId. Mirrors
 * web/src/features/church/types/church.types.ts -> UpdateEventInput.
 */

import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {}
