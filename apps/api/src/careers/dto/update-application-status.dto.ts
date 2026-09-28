import { IsIn } from "class-validator";

export class UpdateApplicationStatusDto {
  @IsIn([
    "applied",
    "viewed",
    "shortlisted",
    "interview",
    "offer",
    "rejected",
  ])
  status!:
    | "applied"
    | "viewed"
    | "shortlisted"
    | "interview"
    | "offer"
    | "rejected";
}
