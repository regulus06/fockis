import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UniversalPaymentService } from './services/payment.service';
import { Public } from '../auth/public.decorator';
import { RbacGuard } from '../admin/rbac/rbac.guard';
import { Roles } from '../admin/rbac/roles.decorator';
import { Role } from '../admin/rbac/roles.enum';
import { SuperAdminGuard } from '../admin/safety/super-admin.guard';

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
      throw new UnauthorizedException('Sign in to continue.');
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

  /**
   * Refunds are no longer available to the person who paid (they could
   * refund themselves after receiving the goods or after a church was paid
   * out). Fockis super admins only. Church owners refund gifts through the
   * giving page, which checks the gift rules first.
   */
  @Post(':paymentId/refund')
  @UseGuards(RbacGuard, SuperAdminGuard)
  @Roles(Role.SUPER_ADMIN)
  async refund(
    @Req() req: any,
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.payments.refundAsPlatform(
      paymentId,
      dto?.amount,
      this.userId(req),
      String(dto?.reason ?? ''),
    );
  }

  /** Stripe → Fockis. Public so Stripe can reach it; every event's signature is verified. */
  @Public()
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
