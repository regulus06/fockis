import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Campaign,
  CampaignSchema,
} from './schemas/campaign.schema';

import {
  Contact,
  ContactSchema,
} from './schemas/contact.schema';

import {
  MailTemplate,
  TemplateSchema,
} from './schemas/template.schema';

import {
  Automation,
  AutomationSchema,
} from './schemas/automation.schema';

import {
  Journey,
  JourneySchema,
} from './schemas/journey.schema';

import {
  MailWorkspace,
  WorkspaceSchema,
} from './schemas/workspace.schema';

import {
  MailCredit,
  CreditSchema,
  MailTransaction,
  TransactionSchema,
} from './schemas/billing.schema';

import {
  ABTest,
  ABTestSchema,
} from './schemas/ab-test.schema';

import {
  SignupForm,
  SignupFormSchema,
} from './schemas/signup-form.schema';

import {
  MailTag,
  TagSchema,
} from './schemas/tag.schema';

// Services
import { CampaignsService } from './services/campaigns.service';
import { ContactsService } from './services/contacts.service';
import { TemplatesService } from './services/templates.service';
import { AutomationsService } from './services/automations.service';
import { JourneysService } from './services/journeys.service';
import { WorkspacesService } from './services/workspaces.service';
import { BillingService } from './services/billing.service';
import { AnalyticsService } from './services/analytics.service';
import { AbTestsService } from './services/ab-tests.service';
import { FormsService } from './services/forms.service';
import { TagsService } from './services/tags.service';

// Controllers
import { CampaignsController } from './controllers/campaigns.controller';
import { ContactsController } from './controllers/contacts.controller';
import { TemplatesController } from './controllers/templates.controller';
import { AutomationsController } from './controllers/automations.controller';
import { JourneysController } from './controllers/journeys.controller';
import { WorkspacesController } from './controllers/workspaces.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { BillingController } from './controllers/billing.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { AbTestsController } from './controllers/ab-tests.controller';
import { FormsController } from './controllers/forms.controller';
import { TagsController } from './controllers/tags.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Campaign.name,
        schema: CampaignSchema,
      },
      {
        name: Contact.name,
        schema: ContactSchema,
      },
      {
        name: MailTemplate.name,
        schema: TemplateSchema,
      },
      {
        name: Automation.name,
        schema: AutomationSchema,
      },
      {
        name: Journey.name,
        schema: JourneySchema,
      },
      {
        name: MailWorkspace.name,
        schema: WorkspaceSchema,
      },
      {
        name: MailCredit.name,
        schema: CreditSchema,
      },
      {
        name: MailTransaction.name,
        schema: TransactionSchema,
      },
      {
        name: ABTest.name,
        schema: ABTestSchema,
      },
      {
        name: SignupForm.name,
        schema: SignupFormSchema,
      },

      // Fockis Mail Tags
      {
        name: MailTag.name,
        schema: TagSchema,
      },
    ]),
  ],

  controllers: [
    CampaignsController,
    ContactsController,
    TemplatesController,
    AutomationsController,
    JourneysController,
    WorkspacesController,
    AnalyticsController,
    BillingController,
    DashboardController,
    AbTestsController,
    FormsController,
    TagsController,
  ],

  providers: [
    CampaignsService,
    ContactsService,
    TemplatesService,
    AutomationsService,
    JourneysService,
    WorkspacesService,
    BillingService,
    AnalyticsService,
    AbTestsService,
    FormsService,
    TagsService,
  ],

  exports: [
    CampaignsService,
    ContactsService,
    AnalyticsService,
    AbTestsService,
    FormsService,
    TagsService,
  ],
})
export class FockisMailModule {}