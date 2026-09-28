import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { SellerService } from "../services/seller.service";
// swap in whatever guard your project actually uses for auth
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";


@Controller("seller")
export class SellerController {

  constructor(
    private readonly sellerService: SellerService
  ) {}

  @Get("profile")
  getProfile(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.sellerService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("become")
  becomeSeller(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.sellerService.becomeSeller(userId);
  }

}