import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { MailchimpService } from "./mailchimp.service";

@Controller("mailchimp")
export class MailchimpController {
  constructor(private readonly mailchimp: MailchimpService) {}

  @Get("status")
  status() {
    return this.mailchimp.status();
  }

  @Get("audiences")
  listAudiences() {
    return this.mailchimp.listAudiences();
  }

  @Get("audiences/:audienceId/members")
  listMembers(
    @Param("audienceId") audienceId: string,
    @Query("count") count?: string,
    @Query("offset") offset?: string,
  ) {
    return this.mailchimp.listMembers(
      audienceId,
      Number(count || 100),
      Number(offset || 0),
    );
  }

  @Put("audiences/:audienceId/members")
  upsertMember(
    @Param("audienceId") audienceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.mailchimp.upsertMember(audienceId, body);
  }

  @Post("audiences/:audienceId/members/:email/tags")
  addTags(
    @Param("audienceId") audienceId: string,
    @Param("email") email: string,
    @Body() body: { tags: string[] },
  ) {
    return this.mailchimp.addTags(audienceId, decodeURIComponent(email), body.tags);
  }

  @Post("campaigns/email")
  createEmailCampaign(@Body() body: Record<string, unknown>) {
    return this.mailchimp.createEmailCampaign(body);
  }

  @Post("campaigns/:campaignId/content")
  setCampaignContent(
    @Param("campaignId") campaignId: string,
    @Body() body: { html: string; plainText?: string },
  ) {
    return this.mailchimp.setCampaignContent(campaignId, body);
  }

  @Post("campaigns/:campaignId/send")
  sendCampaign(@Param("campaignId") campaignId: string) {
    return this.mailchimp.sendCampaign(campaignId);
  }

  @Get("campaigns")
  campaigns(
    @Query("count") count?: string,
    @Query("offset") offset?: string,
  ) {
    return this.mailchimp.listCampaigns(
      Number(count || 20),
      Number(offset || 0),
    );
  }

  @Get("reports")
  reports(
    @Query("count") count?: string,
    @Query("offset") offset?: string,
  ) {
    return this.mailchimp.listReports(
      Number(count || 20),
      Number(offset || 0),
    );
  }

  @Post("transactional/sms")
  transactionalSms(@Body() body: Record<string, unknown>) {
    return this.mailchimp.sendTransactionalSms(body);
  }
}
