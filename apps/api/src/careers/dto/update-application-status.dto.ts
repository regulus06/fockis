
import {
  IsIn,
  IsString,
} from "class-validator";

/**
 * UPDATE APPLICATION STATUS DTO
 *
 * Supported application statuses:
 * applied | viewed | shortlisted | interview | offer | rejected
 */
export class UpdateApplicationStatusDto {
  @IsString()
  @IsIn(
    [
      "applied",
      "viewed",
      "shortlisted",
      "interview",
      "offer",
      "rejected",
    ],
    {
      message:
        "Status must be applied, viewed, shortlisted, interview, offer, or rejected",
    },
  )
  status!:
    | "applied"
    | "viewed"
    | "shortlisted"
    | "interview"
    | "offer"
    | "rejected";
}
