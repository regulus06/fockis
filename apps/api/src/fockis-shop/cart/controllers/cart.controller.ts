import {
BadRequestException,
Body,
Controller,
Delete,
Get,
Param,
Patch,
Post,
Req,
UseGuards,
} from "@nestjs/common";

import { CartService } from "../services/cart.service";
import { AddToCartDto } from "../dto/add-to-cart.dto";
import { UpdateCartItemDto } from "../dto/update-cart-item.dto";

import { JwtAuthGuard } from "../../../auth/jwt-auth.guard";

@Controller("fockis-shop/cart")
@UseGuards(JwtAuthGuard)
export class CartController {
constructor(
private readonly cartService: CartService,
) {}

// ==========================================================================
// GET USER ID
// ==========================================================================

private getUserId(req: any): string {
console.log(
"[FOCKIS CART] req.user:",
JSON.stringify(
req.user,
null,
2,
),
);
const userId =
  req.user?.id ??
  req.user?.userId ??
  req.user?.sub;

console.log(
  "[FOCKIS CART] resolved userId:",
  userId,
);

if (!userId) {
  throw new BadRequestException(
    "User not authenticated",
  );
}

const normalizedUserId =
  userId.toString();

console.log(
  "[FOCKIS CART] normalized userId:",
  normalizedUserId,
);

return normalizedUserId;
}

// ==========================================================================
// GET CART
// ==========================================================================

@Get()
async getCart(
@Req() req: any,
) {
const userId =
this.getUserId(req);

console.log(
  "[FOCKIS CART] GET /cart for:",
  userId,
);

return this.cartService.getCart(
  userId,
);
}

// ==========================================================================
// ADD TO CART
// ==========================================================================

@Post()
async add(
@Req() req: any,
@Body() body: AddToCartDto,
) {
console.log(
"[FOCKIS CART] POST /cart body:",
JSON.stringify(
body,
null,
2,
),
);

if (!body.productId) {
  throw new BadRequestException(
    "Product id required",
  );
}

return this.cartService.addToCart(
  this.getUserId(req),
  body,
);

}

// ==========================================================================
// UPDATE QUANTITY
// ==========================================================================

@Patch(":productId")
async update(
@Req() req: any,
@Param("productId") productId: string,
@Body() body: UpdateCartItemDto,
) {
console.log(
"[FOCKIS CART] PATCH /cart/%s quantity=%s",
productId,
body.quantity,
);

return this.cartService.update(
  this.getUserId(req),
  productId,
  body,
);

}

// ==========================================================================
// REMOVE ITEM
// ==========================================================================

@Delete(":productId")
async remove(
@Req() req: any,
@Param("productId") productId: string,
) {
console.log(
"[FOCKIS CART] DELETE /cart/%s",
productId,
);

return this.cartService.remove(
  this.getUserId(req),
  productId,
);
}

// ==========================================================================
// CLEAR CART
// ==========================================================================

@Delete()
async clear(
@Req() req: any,
) {
console.log(
"[FOCKIS CART] DELETE /cart",
);

return this.cartService.clear(
  this.getUserId(req),
);

}
}
