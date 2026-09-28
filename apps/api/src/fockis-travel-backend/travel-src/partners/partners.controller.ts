import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/auth.guard";
import { Public } from "../../../auth/public.decorator";
import { PartnersService } from "./partners.service";
import { ListingsService } from "../listings/listings.service";

@ApiTags("travel-partners")
@Controller("travel/partners")
export class PartnersController {
  constructor(
    private readonly service: PartnersService,
    private readonly listingsService: ListingsService,
  ) {}

  // ==========================================================================
  // AUTHENTICATED USER ID
  // ==========================================================================

  private getUserId(request: any): string {
    const user = request?.user;

    if (!user) {
      throw new UnauthorizedException(
        "Authenticated user information is missing.",
      );
    }

    const userId =
      user.id ??
      user._id ??
      user.userId ??
      user.sub;

    if (!userId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing.",
      );
    }

    return String(userId);
  }

  // ==========================================================================
  // PUBLIC VERIFIED BUSINESSES
  // ==========================================================================

  @Public()
  @Get("verified")
  @ApiOperation({
    summary: "Get all verified Travel partners",
  })
  verified() {
    return this.service.listVerified();
  }

  // ==========================================================================
  // AUTHENTICATED USER — ALL BUSINESSES
  //
  // IMPORTANT:
  // These routes must appear before @Get(":id").
  // ==========================================================================

  @Get("me/businesses")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Get all Travel businesses owned by the authenticated user",
  })
  businesses(@Req() request: any) {
    return this.service.mineAll(
      this.getUserId(request),
    );
  }

  @Get("me/profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Get the authenticated user's primary Travel partner profile",
  })
  mine(@Req() request: any) {
    return this.service.mine(
      this.getUserId(request),
    );
  }

  @Get("listings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Get listings belonging to the authenticated Travel businesses",
  })
  async myListings(
    @Req() request: any,
  ) {
    const userId =
      this.getUserId(request);

    return this.listingsService.findByPartner(
      userId,
    );
  }

  // ==========================================================================
  // PUBLIC VERIFIED BUSINESS
  // ==========================================================================

  @Public()
  @Get(":id")
  @ApiOperation({
    summary:
      "Get a public verified Travel partner",
  })
  one(
    @Param("id") id: string,
  ) {
    return this.service.publicOne(id);
  }

  // ==========================================================================
  // CREATE A NEW BUSINESS
  //
  // IMPORTANT:
  // This ALWAYS creates a NEW partner document.
  //
  // It does NOT update an existing business.
  // ==========================================================================

  @Post("apply")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Create a new Travel business application",
  })
  apply(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.create(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // BUSINESS INFORMATION
  //
  // These /me routes remain available for compatibility.
  // New multi-business-aware pages should eventually use /:partnerId routes.
  // ==========================================================================

  @Post("me/profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update business profile",
  })
  updateProfile(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.updateProfile(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // CONTACT
  // ==========================================================================

  @Post("me/contact")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update business contact information",
  })
  updateContact(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.updateContact(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  @Post("me/location")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update business location",
  })
  updateLocation(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.updateLocation(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // HOURS
  // ==========================================================================

  @Post("me/hours")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update business hours",
  })
  updateHours(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.updateHours(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // SERVICES
  // ==========================================================================

  @Post("me/services")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add a business service",
  })
  addService(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.addService(
      this.getUserId(request),
      data,
    );
  }

  @Post("me/services/remove")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Remove a business service",
  })
  removeService(
    @Req() request: any,
    @Body() data: { index: number },
  ) {
    return this.service.removeService(
      this.getUserId(request),
      Number(data.index),
    );
  }

  // ==========================================================================
  // AMENITIES
  // ==========================================================================

  @Post("me/amenities")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add a business amenity",
  })
  addAmenity(
    @Req() request: any,
    @Body() data: { amenity: string },
  ) {
    return this.service.addAmenity(
      this.getUserId(request),
      data.amenity,
    );
  }

  @Post("me/amenities/remove")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Remove a business amenity",
  })
  removeAmenity(
    @Req() request: any,
    @Body() data: { amenity: string },
  ) {
    return this.service.removeAmenity(
      this.getUserId(request),
      data.amenity,
    );
  }

  // ==========================================================================
  // IMAGES
  // ==========================================================================

  @Post("me/images")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Add a business gallery image",
  })
  addImage(
    @Req() request: any,
    @Body() data: { url: string },
  ) {
    return this.service.addImage(
      this.getUserId(request),
      data.url,
    );
  }

  @Post("me/images/remove")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Remove a business gallery image",
  })
  removeImage(
    @Req() request: any,
    @Body() data: { index: number },
  ) {
    return this.service.removeImage(
      this.getUserId(request),
      Number(data.index),
    );
  }

  // ==========================================================================
  // MEDIA / BRANDING
  // ==========================================================================

  @Post("me/media")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update business logo and cover image",
  })
  updateMedia(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.updateMedia(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // SOCIAL
  // ==========================================================================

  @Post("me/social")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update business social media links",
  })
  updateSocialLinks(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.updateSocialLinks(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // BOOKING SETTINGS
  // ==========================================================================

  @Post("me/booking-settings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update business booking settings",
  })
  updateBookingSettings(
    @Req() request: any,
    @Body() data: Record<string, unknown>,
  ) {
    return this.service.updateBookingSettings(
      this.getUserId(request),
      data,
    );
  }

  // ==========================================================================
  // ACTIVE / INACTIVE
  // ==========================================================================

  @Post("me/active")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Activate or deactivate business",
  })
  setActive(
    @Req() request: any,
    @Body() data: { active: boolean },
  ) {
    return this.service.setActive(
      this.getUserId(request),
      Boolean(data.active),
    );
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  @Post("me/verification/submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Submit business for verification",
  })
  submitVerification(
    @Req() request: any,
  ) {
    return this.service.submitVerification(
      this.getUserId(request),
    );
  }
}