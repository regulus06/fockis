import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../travel-src/common/auth.guard";
import { TravelAdminService } from "./travel-admin.service";

@ApiTags("Travel Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin/travel")
export class TravelAdminController {
  constructor(
    private readonly travelAdminService: TravelAdminService,
  ) {}

  // ==========================================================================
  // ADMIN AUTHORIZATION
  // ==========================================================================

  private assertAdmin(req: any): void {
    const user = req?.user;

    if (!user) {
      throw new ForbiddenException(
        "Administrator authentication is required.",
      );
    }

    const role = String(
      user.role ?? "",
    )
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const roles = Array.isArray(user.roles)
      ? user.roles.map((item: unknown) =>
          String(item)
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_"),
        )
      : [];

    const isAdmin =
      user.isAdmin === true ||
      user.isSuperAdmin === true ||
      role === "admin" ||
      role === "administrator" ||
      role === "super_admin" ||
      role === "superadmin" ||
      roles.includes("admin") ||
      roles.includes("administrator") ||
      roles.includes("super_admin") ||
      roles.includes("superadmin");

    if (!isAdmin) {
      throw new ForbiddenException(
        "Administrator access is required.",
      );
    }
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  @Get("stats")
  async getStats(
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getStats(
      req.user,
    );
  }

  // ==========================================================================
  // PARTNER APPLICATIONS
  // ==========================================================================

  @Get("partner-applications")
  async getPartnerApplications(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getPartnerApplications({
      status,
      search,
      limit: limit
        ? Number(limit)
        : undefined,
      skip: skip
        ? Number(skip)
        : undefined,
    });
  }

  @Get("partner-applications/:id")
  async getPartnerApplication(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getPartnerApplication(
      id,
    );
  }

  @Patch(
    "partner-applications/:id/status",
  )
  async updatePartnerApplicationStatus(
    @Param("id") id: string,
    @Body()
    body: {
      status?: string;
      reason?: string;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (!body.status) {
      throw new BadRequestException(
        "Application status is required.",
      );
    }

    return this.travelAdminService.updatePartnerApplicationStatus(
      id,
      body.status,
      body.reason,
      req.user,
    );
  }

  @Post(
    "partner-applications/:id/request-info",
  )
  async requestPartnerApplicationInfo(
    @Param("id") id: string,
    @Body()
    body: {
      message?: string;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.requestPartnerApplicationInfo(
      id,
      body.message,
      req.user,
    );
  }

  // ==========================================================================
  // PARTNERS
  // ==========================================================================

  @Get("partners")
  async getPartners(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getPartners({
      status,
      search,
      limit: limit
        ? Number(limit)
        : undefined,
      skip: skip
        ? Number(skip)
        : undefined,
    });
  }

  @Get("partners/:id")
  async getPartner(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getPartner(
      id,
    );
  }

  @Patch("partners/:id/status")
  async updatePartnerStatus(
    @Param("id") id: string,
    @Body()
    body: {
      status?: string;
      reason?: string;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (!body.status) {
      throw new BadRequestException(
        "Partner status is required.",
      );
    }

    return this.travelAdminService.updatePartnerStatus(
      id,
      body.status,
      body.reason,
      req.user,
    );
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  @Get("users")
  async getUsers(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("role") role?: string,
    @Query("accountType") accountType?: string,
    @Query("countryCode") countryCode?: string,
    @Query("country") country?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getUsers(
      {
        status,
        role,
        accountType,
        countryCode:
          countryCode ?? country,
        search,
        limit: limit
          ? Number(limit)
          : undefined,
        skip: skip
          ? Number(skip)
          : undefined,
      },
      req.user,
    );
  }

  @Get("users/:id")
  async getUser(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getUser(
      id,
      req.user,
    );
  }

  @Patch("users/:id/status")
  async updateUserStatus(
    @Param("id") id: string,
    @Body()
    body: {
      status?: string;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (!body.status) {
      throw new BadRequestException(
        "User status is required.",
      );
    }

    return this.travelAdminService.updateUserStatus(
      id,
      body.status,
      req.user,
    );
  }

  @Patch("users/:id/verification")
  async updateUserVerification(
    @Param("id") id: string,
    @Body()
    body: {
      verified?: boolean;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (
      typeof body.verified !==
      "boolean"
    ) {
      throw new BadRequestException(
        "verified must be a boolean.",
      );
    }

    return this.travelAdminService.updateUserVerification(
      id,
      body.verified,
      req.user,
    );
  }

  @Patch("users/:id/role")
  async updateUserRole(
    @Param("id") id: string,
    @Body()
    body: {
      role?: string;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (!body.role) {
      throw new BadRequestException(
        "User role is required.",
      );
    }

    return this.travelAdminService.updateUserRole(
      id,
      body.role,
      req.user,
    );
  }

  @Patch("users/:id/account-type")
  async updateUserAccountType(
    @Param("id") id: string,
    @Body()
    body: {
      accountType?: string;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (!body.accountType) {
      throw new BadRequestException(
        "Account type is required.",
      );
    }

    return this.travelAdminService.updateUserAccountType(
      id,
      body.accountType,
      req.user,
    );
  }

  @Patch(
    "users/:id/fockis-id-access",
  )
  async updateUserFockisIdAccess(
    @Param("id") id: string,
    @Body()
    body: {
      accessPaid?: boolean;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (
      typeof body.accessPaid !==
      "boolean"
    ) {
      throw new BadRequestException(
        "accessPaid must be a boolean.",
      );
    }

    return this.travelAdminService.updateUserFockisIdAccess(
      id,
      body.accessPaid,
      req.user,
    );
  }

  @Patch("users/:id/premium")
  async updateUserPremium(
    @Param("id") id: string,
    @Body()
    body: {
      premium?: boolean;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (
      typeof body.premium !==
      "boolean"
    ) {
      throw new BadRequestException(
        "premium must be a boolean.",
      );
    }

    return this.travelAdminService.updateUserPremium(
      id,
      body.premium,
      req.user,
    );
  }

  // ==========================================================================
  // LISTINGS
  // ==========================================================================

  @Get("listings")
  async getListings(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("flaggedOnly")
    flaggedOnly?: string,
    @Query("search") search?: string,
    @Query("partnerId") partnerId?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getListings({
      status,
      type,
      flaggedOnly:
        flaggedOnly === "true"
          ? true
          : flaggedOnly === "false"
            ? false
            : undefined,
      search,
      partnerId,
      limit: limit
        ? Number(limit)
        : undefined,
      skip: skip
        ? Number(skip)
        : undefined,
    });
  }

  @Get("listings/:id")
  async getListing(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getListing(
      id,
    );
  }

  @Patch("listings/:id/status")
  async updateListingStatus(
    @Param("id") id: string,
    @Body()
    body: {
      status?: string;
      reason?: string;
    },
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    if (!body.status) {
      throw new BadRequestException(
        "Listing status is required.",
      );
    }

    return this.travelAdminService.updateListingStatus(
      id,
      body.status,
      body.reason,
      req.user,
    );
  }

  @Delete("listings/:id")
  async deleteListing(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.deleteListing(
      id,
      req.user,
    );
  }

  // ==========================================================================
  // BOOKINGS
  // ==========================================================================

  @Get("bookings")
  async getBookings(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("search") search?: string,
    @Query("listingId") listingId?: string,
    @Query("userId") userId?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getBookings({
      status,
      type,
      search,
      listingId,
      userId,
      limit: limit
        ? Number(limit)
        : undefined,
      skip: skip
        ? Number(skip)
        : undefined,
    });
  }

  @Get("bookings/:id")
  async getBooking(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    this.assertAdmin(req);

    return this.travelAdminService.getBooking(
      id,
    );
  }
}