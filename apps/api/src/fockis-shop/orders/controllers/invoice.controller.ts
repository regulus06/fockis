import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';
import { OrdersService } from '../services/orders.service';
import { InvoiceService } from '../services/invoice.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

@Controller('marketplace/orders')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get(':id/invoice/pdf')
  async downloadInvoice(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const order = await this.ordersService.findOne(id);

    const pdf = await this.invoiceService.generateInvoice(order as any);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
    });

    res.end(pdf);
  }
}