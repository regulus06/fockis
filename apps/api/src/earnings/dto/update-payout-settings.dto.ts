import {
  IsIn,
} from "class-validator";

export class UpdatePayoutSettingsDto {
  @IsIn([
    "manual",
    "daily",
    "weekly",
    "monthly",
  ])
  payoutSchedule!:
    | "manual"
    | "daily"
    | "weekly"
    | "monthly";
}