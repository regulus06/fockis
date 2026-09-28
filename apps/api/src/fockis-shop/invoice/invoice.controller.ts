import { Controller, Get, Param } from '@nestjs/common';
import { OrdersService } from '../orders/services/orders.service';
import { InvoiceService } from './invoice.service';

@Controller('marketplace/orders/invoice')
export class InvoiceController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get(':id')
  async getInvoice(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    return this.invoiceService.generateInvoice(order);
  }
}