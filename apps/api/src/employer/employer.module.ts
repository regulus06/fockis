import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerController } from './employer.controller';
import { EmployerService } from './employer.service';
import { EmployerProfile, EmployerProfileSchema } from './schemas/employer-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EmployerProfile.name, schema: EmployerProfileSchema }]),
  ],
  controllers: [EmployerController],
  providers: [EmployerService],
  exports: [EmployerService],
})
export class EmployerModule {}
