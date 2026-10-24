import { IsBoolean, IsEnum, IsOptional } from "class-validator";

import { EventRsvpStatus } from "../schemas/event.schema";
import { OptionalBoolean } from "./event-dto.helpers";

/**
 * POST /events/:id/rsvp
 *
 *   {}                         -> Going (original behaviour)
 *   { "status": "going" }      -> Going
 *   { "status": "interested" } -> Interested
 *   { "interested": true }     -> Interested (legacy field)
 */
export class RsvpEventDto {
  @IsOptional()
  @IsEnum(EventRsvpStatus, { message: "status must be 'going' or 'interested'." })
  status?: EventRsvpStatus;

  @IsOptional()
  @OptionalBoolean()
  @IsBoolean()
  interested?: boolean;
}
