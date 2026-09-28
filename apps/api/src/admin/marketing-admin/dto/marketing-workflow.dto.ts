import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export class MarketingWorkflowDto {
  @IsOptional()
  @IsEnum(["AUTO_PUBLISH", "REQUIRE_ADMIN_APPROVAL", "REQUIRE_TWO_ADMIN_APPROVALS"])
  campaignApprovalMode?: "AUTO_PUBLISH" | "REQUIRE_ADMIN_APPROVAL" | "REQUIRE_TWO_ADMIN_APPROVALS";

  @IsOptional()
  @IsEnum(["AUTO_PUBLISH", "REQUIRE_ADMIN_APPROVAL", "REQUIRE_TWO_ADMIN_APPROVALS"])
  adApprovalMode?: "AUTO_PUBLISH" | "REQUIRE_ADMIN_APPROVAL" | "REQUIRE_TWO_ADMIN_APPROVALS";

  @IsOptional() @IsBoolean() autoPublishTrustedAdvertisers?: boolean;
  @IsOptional() @IsBoolean() blockedCampaignStopsAds?: boolean;
  @IsOptional() @IsBoolean() blockedCampaignStopsScheduledAds?: boolean;
  @IsOptional() @IsBoolean() blockedCampaignStopsNotifications?: boolean;
  @IsOptional() @IsBoolean() notifyAdvertiserOnBlock?: boolean;
  @IsOptional() @IsBoolean() requireReviewBeforeReactivation?: boolean;
}
