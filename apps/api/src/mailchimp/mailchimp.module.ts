import { Module } from "@nestjs/common";
import { MailchimpController } from "./mailchimp.controller";
import { MailchimpService } from "./mailchimp.service";

@Module({
  controllers: [MailchimpController],
  providers: [MailchimpService],
  exports: [MailchimpService],
})
export class MailchimpModule {}
