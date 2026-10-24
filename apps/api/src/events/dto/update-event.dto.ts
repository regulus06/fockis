import { PartialType } from "@nestjs/mapped-types";

import { CreateEventDto } from "./create-event.dto";

/**
 * Every create field is optional on update. Validation and multipart
 * transforms are inherited from CreateEventDto, so both endpoints accept
 * exactly the same shapes.
 *
 * Clearing values: send capacity / latitude / longitude as null (or the
 * string "null" in multipart) to remove them.
 */
export class UpdateEventDto extends PartialType(CreateEventDto) {}
