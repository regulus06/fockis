import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { CreateContactMessageDto } from '../dto/create-contact-message.dto';
import { UpdateContactMessageDto } from '../dto/update-contact-message.dto';
import { AcademyJwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('academy/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Open — this is the "Send Message" submission itself.
  @Post()
  create(@Body() dto: CreateContactMessageDto) {
    return this.contactService.create(dto);
  }

  @Get()
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'admissions', 'staff')
  findAll() {
    return this.contactService.findAll();
  }

  @Patch(':id/status')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'admissions', 'staff')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContactMessageDto) {
    return this.contactService.updateStatus(id, dto);
  }

  @Delete(':id')
  @UseGuards(AcademyJwtAuthGuard, RolesGuard)
  @Roles('administrator', 'admissions', 'staff')
  remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
