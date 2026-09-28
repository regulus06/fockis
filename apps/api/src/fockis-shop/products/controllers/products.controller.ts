import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { ProductsService } from "../services/products.service";
import { CreateProductDto } from "../dto/create-product.dto";

import { Public } from "../../../auth/public.decorator";
import { JwtAuthGuard } from "../../../auth/jwt-auth.guard";

function getUserId(req: any): string {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.sub
  );
}

@Controller("marketplace/products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  // =====================================================
  // SELLER CENTER
  // ACTIVE STORE PRODUCTS
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Get("seller/:storeId")
  getSellerStoreProducts(
    @Req() req: any,
    @Param("storeId") storeId: string,
  ) {
    return this.productsService.getSellerStoreProducts(
      storeId,
      getUserId(req),
    );
  }

  // =====================================================
  // SELLER ALL PRODUCTS
  // FALLBACK COMPATIBILITY
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Get("seller")
  getSellerProducts(@Req() req: any) {
    return this.productsService.getSellerProducts(
      getUserId(req),
    );
  }

  // =====================================================
  // STORE PUBLIC PRODUCTS
  // =====================================================

  @Public()
  @Get("store/:storeId")
  getStoreProducts(
    @Param("storeId") storeId: string,
  ) {
    return this.productsService.getStoreProducts(
      storeId,
    );
  }

  // =====================================================
  // MARKETPLACE PRODUCTS
  // PUBLIC
  // =====================================================

  @Public()
  @Get()
  getAll(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "12",
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("sort") sort = "newest",
  ) {
    return this.productsService.getMarketplaceProducts({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      categoryId,
      sort,
    });
  }

  // =====================================================
  // SINGLE PRODUCT
  // =====================================================

  @Public()
  @Get(":id")
  getById(
    @Param("id") id: string,
  ) {
    return this.productsService.getById(id);
  }

  // =====================================================
  // CREATE PRODUCT
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() req: any,
    @Body() body: CreateProductDto,
  ) {
    return this.productsService.create(
      body,
      getUserId(req),
    );
  }

  // =====================================================
  // UPDATE PRODUCT
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.productsService.update(
      id,
      body,
      getUserId(req),
    );
  }

  // =====================================================
  // DELETE PRODUCT
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  delete(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.productsService.delete(
      id,
      getUserId(req),
    );
  }
}