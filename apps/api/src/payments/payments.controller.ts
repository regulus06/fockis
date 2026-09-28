import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UniversalPaymentService } from './services/payment.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: UniversalPaymentService,
  ) {}

  private userId(req: any): string {
    const id =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId ??
      req.user?.sub;

    if (!id) {
      throw new Error('Authenticated user ID is missing.');
    }

    return String(id);
  }

  @Post('create')
  async create(
    @Req() req: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.payments.createPayment(
      this.userId(req),
      dto,
    );
  }

  @Post('confirm')
  async confirm(
    @Req() req: any,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.payments.confirmPayment(
      this.userId(req),
      dto.paymentIntentId,
    );
  }

  @Post(':paymentId/refund')
  async refund(
    @Req() req: any,
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.payments.refund(
      this.userId(req),
      paymentId,
      dto.amount,
    );
  }

  @Post('webhook')
  async webhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.payments.handleWebhook(
      req.rawBody as Buffer,
      signature,
    );
  }
}