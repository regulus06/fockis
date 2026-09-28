import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { MarketingAdminService } from "./marketing-admin.service";
import { MarketingAdminGuard, requireMarketingPermission } from "./marketing-admin.guard";
import { MarketingActionDto } from "./dto/marketing-action.dto";
import { MarketingWorkflowDto } from "./dto/marketing-workflow.dto";

@Controller("admin/marketing-admin")
@UseGuards(MarketingAdminGuard)
export class MarketingAdminController {
  constructor(private readonly service: MarketingAdminService) {}

  @Get()
  overviewRoot(@Req() req: any) { return this.overview(req); }

  @Get("overview")
  overview(@Req() req: any) {
    requireMarketingPermission(req, "marketing.view");
    return this.service.overview();
  }

  @Get("campaigns")
  campaigns(@Query() query: any, @Req() req: any) {
    requireMarketingPermission(req, "marketing.campaign.view");
    return this.service.listCampaigns(query);
  }

  @Get("campaigns/:id")
  campaign(@Param("id") id: string, @Req() req: any) {
    requireMarketingPermission(req, "marketing.campaign.view");
    return this.service.getCampaign(id);
  }

  @Get("ads")
  ads(@Query() query: any, @Req() req: any) {
    requireMarketingPermission(req, "marketing.ad.view");
    return this.service.listAds(query);
  }

  @Get("ads/:id")
  ad(@Param("id") id: string, @Req() req: any) {
    requireMarketingPermission(req, "marketing.ad.view");
    return this.service.getAd(id);
  }

  @Get("workflow")
  workflow(@Req() req: any) {
    requireMarketingPermission(req, "marketing.workflow.view");
    return this.service.getWorkflow().then((workflow) => ({ success: true, workflow }));
  }

  @Patch("workflow")
  @Put("workflow")
  updateWorkflow(@Body() dto: MarketingWorkflowDto, @Req() req: any) {
    requireMarketingPermission(req, "marketing.workflow.edit");
    return this.service.updateWorkflow(dto, req.user).then((workflow) => ({ success: true, workflow }));
  }

  @Get("permissions")
  permissions(@Req() req: any) {
    requireMarketingPermission(req, "marketing.view");
    return this.service.getPermissions();
  }

  @Get("campaign-statuses")
  statuses(@Req() req: any) {
    requireMarketingPermission(req, "marketing.view");
    return this.service.getStatuses();
  }

  @Get("audit")
  audit(@Query("resourceType") resourceType: string | undefined, @Query("resourceId") resourceId: string | undefined, @Req() req: any) {
    requireMarketingPermission(req, "marketing.audit.view");
    return this.service.getAudit(resourceType, resourceId);
  }

  @Post("campaigns/:id/approve") approve(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "APPROVE", body, req); }
  @Post("campaigns/:id/publish") publish(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "PUBLISH", body, req); }
  @Post("campaigns/:id/reject") reject(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "REJECT", body, req); }
  @Post("campaigns/:id/pause") pause(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "PAUSE", body, req); }
  @Post("campaigns/:id/resume") resume(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "RESUME", body, req); }
  @Post("campaigns/:id/block") block(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "BLOCK", body, req); }
  @Post("campaigns/:id/unblock") unblock(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "UNBLOCK", body, req); }
  @Post("campaigns/:id/archive") archive(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("campaign", id, "ARCHIVE", body, req); }

  @Post("ads/:id/approve") approveAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "APPROVE", body, req); }
  @Post("ads/:id/publish") publishAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "PUBLISH", body, req); }
  @Post("ads/:id/reject") rejectAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "REJECT", body, req); }
  @Post("ads/:id/pause") pauseAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "PAUSE", body, req); }
  @Post("ads/:id/resume") resumeAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "RESUME", body, req); }
  @Post("ads/:id/block") blockAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "BLOCK", body, req); }
  @Post("ads/:id/unblock") unblockAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "UNBLOCK", body, req); }
  @Post("ads/:id/archive") archiveAd(@Param("id") id: string, @Body() body: MarketingActionDto, @Req() req: any) { return this.action("ad", id, "ARCHIVE", body, req); }

  private action(kind: "campaign" | "ad", id: string, action: any, body: MarketingActionDto, req: any) {
    return this.service.action(kind, id, action, body || {}, req.user);
  }
}
