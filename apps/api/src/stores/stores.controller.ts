import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Public } from "../auth/public.decorator";

import { CreateStoreDto } from "./dto/create-store.dto";
import { StoresService } from "./stores.service";

function getUserId(req: any): string {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.sub
  );
}

@Controller("stores")
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
  ) {}

  // =====================================================
  // CREATE STORE
  // POST /stores
  // AUTHENTICATED
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() body: CreateStoreDto,
    @Req() req: any,
  ) {
    return this.storesService.create(
      body,
      getUserId(req),
    );
  }

  // =====================================================
  // PUBLIC STORES
  // GET /stores
  // =====================================================

  @Public()
  @Get()
  getAll() {
    return this.storesService.getAll();
  }

  // =====================================================
  // CURRENT USER STORES
  // GET /stores/me
  // AUTHENTICATED
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMyStores(
    @Req() req: any,
  ) {
    return this.storesService.getBySeller(
      getUserId(req),
    );
  }

  // =====================================================
  // PUBLIC STORE BY SLUG
  // GET /stores/slug/:slug
  // =====================================================

  @Public()
  @Get("slug/:slug")
  getBySlug(
    @Param("slug") slug: string,
  ) {
    return this.storesService.getBySlug(
      slug,
    );
  }

  // =====================================================
  // FOLLOW STORE
  // POST /stores/:id/follow
  // AUTHENTICATED
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Post(":id/follow")
  follow(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.storesService.followStore(
      id,
      getUserId(req),
    );
  }

  // =====================================================
  // UPDATE STORE
  // PUT /stores/:id
  // AUTHENTICATED
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.storesService.update(
      id,
      body,
      getUserId(req),
    );
  }

  // =====================================================
  // DELETE STORE
  // DELETE /stores/:id
  // AUTHENTICATED
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  delete(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.storesService.delete(
      id,
      getUserId(req),
    );
  }
}