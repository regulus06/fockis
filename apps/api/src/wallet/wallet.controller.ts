import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";

import { WalletService } from "./wallet.service";

import { BuyCoinsDto } from "./dto/buy-coins.dto";

// IMPORTANT:
// Change this path only if your project's existing JWT guard
// is located somewhere else.
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("wallet")
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
  ) {}

  // ============================================================
  // GET CURRENT WALLET
  //
  // GET /wallet
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get()
  async getWallet(
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);

    return this.walletService.getWallet(userId);
  }

  // ============================================================
  // GET CURRENT BALANCE
  //
  // GET /wallet/balance
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get("balance")
  async getBalance(
    @Req() req: any,
  ) {
    const userId = this.getUserId(req);

    const coins =
      await this.walletService.getBalance(
        userId,
      );

    return {
      success: true,
      coins,
    };
  }

  // ============================================================
  // GET COIN PACKAGES
  //
  // GET /wallet/coin-packages
  //
  // Returns:
  // Starter
  // Popular
  // Value
  // Premium
  // Ultimate
  // ============================================================

  @Get("coin-packages")
  async getCoinPackages() {
    return this.walletService.getCoinPackages();
  }

  // ============================================================
  // CREATE COIN PURCHASE
  //
  // POST /wallet/buy-coins
  //
  // Body:
  //
  // {
  //   "packageId": "popular"
  // }
  //
  // IMPORTANT:
  // This creates the Stripe PaymentIntent.
  //
  // It does NOT credit coins.
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post("buy-coins")
  async buyCoins(
    @Req() req: any,
    @Body() dto: BuyCoinsDto,
  ) {
    const userId =
      this.getUserId(req);

    if (!dto.packageId) {
      throw new BadRequestException(
        "Coin package ID is required.",
      );
    }

    return this.walletService.createCoinPurchase(
      userId,
      dto.packageId,
    );
  }

  // ============================================================
  // CONFIRM COIN PURCHASE
  //
  // POST /wallet/confirm-coin-purchase
  //
  // Body:
  //
  // {
  //   "paymentIntentId": "pi_xxxxxxxxx"
  // }
  //
  // Coins are credited ONLY after Stripe confirms
  // the PaymentIntent succeeded.
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post("confirm-coin-purchase")
  async confirmCoinPurchase(
    @Req() req: any,
    @Body()
    body: {
      paymentIntentId?: string;
    },
  ) {
    const userId =
      this.getUserId(req);

    if (!body.paymentIntentId) {
      throw new BadRequestException(
        "Payment Intent ID is required.",
      );
    }

    return this.walletService.confirmCoinPurchase(
      userId,
      body.paymentIntentId,
    );
  }

  // ============================================================
  // GET TRANSACTIONS
  //
  // GET /wallet/transactions
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get("transactions")
  async getTransactions(
    @Req() req: any,
  ) {
    const userId =
      this.getUserId(req);

    return {
      success: true,

      transactions:
        await this.walletService.getTransactions(
          userId,
        ),
    };
  }

  // ============================================================
  // GET USER ID
  //
  // Supports the different JWT payload formats used
  // throughout the application.
  // ============================================================

  private getUserId(
    req: any,
  ): string {
    const userId =
      req?.user?.userId ??
      req?.user?.sub ??
      req?.user?.id ??
      req?.user?._id;

    if (!userId) {
      throw new BadRequestException(
        "Authenticated user ID not found.",
      );
    }

    return String(userId);
  }
}