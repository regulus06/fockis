import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { MusicPurchaseService } from '../services/music-purchase.service';
import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('music/purchases')
@UseGuards(JwtAuthGuard)
export class MusicPurchasesController {
  constructor(private readonly purchaseService: MusicPurchaseService) {}

  // Returns a Stripe client secret; the frontend completes payment with
  // your EXISTING Stripe Elements/Payment Sheet flow. This endpoint never
  // marks a purchase as succeeded itself.
  @Post()
  async initiate(@Req() req: any, @Body() dto: CreatePurchaseDto) {
    return this.purchaseService.initiatePurchase(req.user.id, dto.contentId);
  }

  @Get()
  async myPurchases(@Req() req: any) {
    return this.purchaseService.listForUser(req.user.id);
  }
}
