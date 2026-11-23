import { Type } from "class-transformer";
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

import { DISPUTE_REASONS, DISPUTE_STATUSES } from "./schemas/dispute.schema";

export class OpenDisputeDto {
  @IsMongoId() orderId!: string;
  @IsIn(DISPUTE_REASONS as unknown as string[]) reason!: string;
  @IsString() @MinLength(10) @MaxLength(2000) description!: string;
}

export class DisputeListQueryDto {
  @IsOptional() @IsIn(["active", ...(DISPUTE_STATUSES as unknown as string[])]) status?: string;
  @IsOptional() @IsString() @MaxLength(40) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class ReviewDisputeDto {
  @IsIn(["start_review", "resolve_buyer", "resolve_seller", "close"])
  action!: "start_review" | "resolve_buyer" | "resolve_seller" | "close";

  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
