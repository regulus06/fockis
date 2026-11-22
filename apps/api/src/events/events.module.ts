import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { EventsController } from './controllers/events.controller';
import { OrganizationEventsController } from './controllers/organization-events.controller';
import { EventsService } from './services/events.service';
import { OrganizationEventCatalogService } from './services/organization-event-catalog.service';
import { Event, EventSchema } from './schemas/event.schema';

import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { EventRegistrationsController } from './registrations/event-registrations.controller';
import { EventRegistrationsService } from './registrations/event-registrations.service';
import { RegistrationMailer } from './registrations/registration-mailer';
import {
  EventRegistration,
  EventRegistrationSchema,
} from './registrations/event-registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Event.name,
        schema: EventSchema,
      },
      {
        name: EventRegistration.name,
        schema: EventRegistrationSchema,
      },
    ]),

    // Paid registrations use the existing Fockis payment service.
    PaymentsModule,

    // In-app notifications for confirmations, reminders and changes.
    NotificationsModule,
  ],
  // Registrations first so /events/registrations/... is never read as an event id.
  controllers: [EventRegistrationsController, OrganizationEventsController, EventsController],
  providers: [EventsService, EventRegistrationsService, RegistrationMailer, OrganizationEventCatalogService],
  exports: [EventsService, EventRegistrationsService],
})
export class EventsModule {}
