import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';


import {
  Property,
  PropertySchema,
} from './schemas/property.schema';



import {
  PropertyAudit,
  PropertyAuditSchema,
} from './admin/schemas/property-audit.schema';
import { AgentsModule } from './agents/agents.module';
import { LandlordsModule } from './landlords/landlords.module';
import { TenantsModule } from './tenants/tenants.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ToursModule } from './tours/tours.module';
import { LeasesModule } from './leases/leases.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { DocumentsModule } from './documents/documents.module';
import { ContractsModule } from './contracts/contracts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RecommendationModule } from './recommendation/recommendation.module';



import { PropertyController }
from './controllers/property.controller';


import { PropertyService }
from './services/property.service';



import { AdminPropertyController }
from './admin/controllers/admin-property.controller';


import { AdminPropertyService }
from './admin/services/admin-property.service';



@Module({

  imports: [

    MongooseModule.forFeature([

      {
        name: Property.name,
        schema: PropertySchema,
      },


      {
        name: PropertyAudit.name,
        schema: PropertyAuditSchema,
      },

    ]),

    AgentsModule,

    LandlordsModule,

    TenantsModule,

    InquiriesModule,

    FavoritesModule,

    ToursModule,

    LeasesModule,

    MaintenanceModule,

    DocumentsModule,

    ContractsModule,

    AnalyticsModule,

    RecommendationModule,

  ],



  controllers: [

    PropertyController,

    AdminPropertyController,

  ],



  providers: [

    PropertyService,

    AdminPropertyService,

  ],



  exports: [

    PropertyService,

  ],

})

export class RealEstateModule {}