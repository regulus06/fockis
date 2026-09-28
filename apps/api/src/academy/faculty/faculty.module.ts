import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Faculty, FacultySchema } from './schemas/faculty.schema';
import { FacultyService } from './services/faculty.service';
import { FacultyController } from './controllers/faculty.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Faculty.name, schema: FacultySchema }])],
  controllers: [FacultyController],
  providers: [FacultyService],
  exports: [FacultyService],
})
export class FacultyModule {}
