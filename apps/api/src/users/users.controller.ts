import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Req,
  UnauthorizedException,
  ForbiddenException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

import { UsersService } from "./users.service";
import { BlockVisibilityService } from "../friends/services/block-visibility.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly blockVisibilityService: BlockVisibilityService,
  ) {}

  // ============================================================
  // CURRENT LOGGED USER
  // GET /users/me
  // ============================================================

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return req.user;
  }

  // ============================================================
  // CURRENT USER FOCKIS ID
  //
  // GET /users/me/fockis-id
  //
  // Example response:
  //
  // {
  //   "fockisId": "FK7Q2M8A",
  //   "publicFockisId": "+509-FK7Q2M8A",
  //   "countryCode": "HT",
  //   "callingCode": "+509",
  //   "countryName": "Haiti",
  //   "accessPaid": true,
  //   "requiresPayment": false,
  //   "accessGranted": true,
  //   "price": 5,
  //   "currency": "usd",
  //   "oneTime": true,
  //   "recurring": false
  // }
  //
  // ============================================================

  @Get("me/fockis-id")
  @UseGuards(JwtAuthGuard)
  async getMyFockisId(
    @Req() req: any,
  ) {
    const userId = this.getAuthenticatedUserId(req);

    return this.usersService.getFockisIdAccessStatus(
      userId,
    );
  }

  // ============================================================
  // SEARCH BY FOCKIS ID
  //
  // GET /users/search/fockis-id?q=+509-FK7Q2M8A
  //
  // Supported:
  //
  // FK7Q2M8A
  // +509-FK7Q2M8A
  // +509 FK7Q2M8A
  // +509FK7Q2M8A
  //
  // This endpoint is intended for:
  //
  // - Messaging
  // - Calling
  // - Friend requests
  // - Profile lookup
  // - Sharing a Fockis identity
  //
  // The service should return the INTERNAL MongoDB user ID
  // alongside the public Fockis identity.
  //
  // IMPORTANT:
  // The internal user ID remains the identity used by
  // conversations and socket connections.
  //
  // ============================================================

  @Get("search/fockis-id")
  @UseGuards(JwtAuthGuard)
  async searchByFockisId(
    @Query("q") query: string,
    @Req() req: any,
  ) {
    const currentUserId =
      this.getAuthenticatedUserId(req);

    return this.usersService.searchByFockisId(
      String(query || ""),
      currentUserId,
    );
  }

  // ============================================================
  // CURRENT USER PROFILE
  // GET /users/me/profile
  // ============================================================

  @Get("me/profile")
  @UseGuards(JwtAuthGuard)
  getMyProfile(
    @Req() req: any,
  ) {
    const userId =
      this.getAuthenticatedUserId(req);

    return this.usersService.getUserById(
      userId,
    );
  }

  // ============================================================
  // GENERAL USER SEARCH
  //
  // GET /users/search?q=john
  //
  // This remains for username/name discovery.
  // Fockis ID searches use:
  //
  // GET /users/search/fockis-id?q=...
  //
  // ============================================================

  @Get("search")
  @UseGuards(JwtAuthGuard)
  searchUsers(
    @Query("q") query: string,
    @Req() req: any,
  ) {
    const currentUserId =
      this.getAuthenticatedUserId(req);

    return this.usersService.searchUsers(
      String(query || ""),
      currentUserId,
    );
  }

  // ============================================================
  // FIND USER BY FOCKIS ID
  //
  // GET /users/fockis/:fockisId
  //
  // Examples:
  //
  // /users/fockis/FK8H42K9
  //
  // /users/fockis/+509-FK8H42K9
  //
  // /users/fockis/+509%20FK8H42K9
  //
  // /users/fockis/+509FK8H42K9
  //
  // The service is responsible for normalizing the identity.
  //
  // ============================================================

  @Get("fockis/:fockisId")
  @UseGuards(JwtAuthGuard)
  async getUserByFockisId(
    @Param("fockisId") fockisId: string,
    @Req() req: any,
  ) {
    const currentUserId =
      this.getAuthenticatedUserId(req);

    return this.usersService.findByFockisId(
      decodeURIComponent(
        String(fockisId || ""),
      ),
      currentUserId,
    );
  }

  // ============================================================
  // DISCOVER USERS
  //
  // GET /users/:id/discover
  //
  // IMPORTANT:
  // This route stays AFTER the specific routes above.
  // ============================================================

  @Get(":id/discover")
  discoverUsers(
    @Param("id") id: string,
  ) {
    return this.usersService.getDiscoverUsers(
      id,
    );
  }

  // ============================================================
  // GET USER PROFILE
  //
  // GET /users/:id
  //
  // This returns the normal internal-user profile.
  //
  // Messaging/calling should use the returned MongoDB ID
  // internally, not the public Fockis ID.
  //
  // ============================================================

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getUser(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const currentUserId =
      this.getAuthenticatedUserId(req);

    const canView =
      await this.blockVisibilityService.canView(
        currentUserId,
        id,
      );

    if (!canView) {
      throw new ForbiddenException(
        "You cannot view this profile.",
      );
    }

    return this.usersService.getUserById(
      id,
    );
  }

  // ============================================================
  // UPDATE PROFILE
  //
  // PATCH /users/:id
  // ============================================================

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: any,
  ) {
    this.verifyOwner(
      req,
      id,
    );

    return this.usersService.updateUser(
      id,
      dto,
    );
  }

  // ============================================================
  // PROFILE PHOTO
  //
  // PATCH /users/:id/profile-picture
  // ============================================================

  @Patch(":id/profile-picture")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",

        filename: (
          req,
          file,
          callback,
        ) => {
          const name =
            Date.now() +
            "-" +
            Math.round(
              Math.random() * 1e9,
            );

          callback(
            null,
            name +
              extname(
                file.originalname,
              ),
          );
        },
      }),
    }),
  )
  uploadProfilePicture(
    @Param("id") id: string,
    @UploadedFile()
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.verifyOwner(
      req,
      id,
    );

    if (!file) {
      throw new UnauthorizedException(
        "Profile picture file is required",
      );
    }

    return this.usersService.updateUser(
      id,
      {
        profilePicture:
          `/uploads/${file.filename}`,
      },
    );
  }

  // ============================================================
  // COVER PHOTO
  //
  // PATCH /users/:id/cover-photo
  // ============================================================

  @Patch(":id/cover-photo")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",

        filename: (
          req,
          file,
          callback,
        ) => {
          const name =
            Date.now() +
            "-" +
            Math.round(
              Math.random() * 1e9,
            );

          callback(
            null,
            name +
              extname(
                file.originalname,
              ),
          );
        },
      }),
    }),
  )
  uploadCoverPhoto(
    @Param("id") id: string,
    @UploadedFile()
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.verifyOwner(
      req,
      id,
    );

    if (!file) {
      throw new UnauthorizedException(
        "Cover photo file is required",
      );
    }

    return this.usersService.updateUser(
      id,
      {
        coverPhoto:
          `/uploads/${file.filename}`,
      },
    );
  }

  // ============================================================
  // CHANGE PASSWORD
  //
  // PUT /users/:id/password
  // ============================================================

  @Put(":id/password")
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    this.verifyOwner(
      req,
      id,
    );

    return this.usersService.changePassword(
      id,
      body.currentPassword,
      body.newPassword,
    );
  }

  // ============================================================
  // DELETE ACCOUNT
  //
  // DELETE /users/:id
  // ============================================================

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  deleteUser(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    this.verifyOwner(
      req,
      id,
    );

    return this.usersService.deleteUser(
      id,
    );
  }

  // ============================================================
  // AUTHENTICATED USER ID HELPER
  // ============================================================

  private getAuthenticatedUserId(
    req: any,
  ): string {
    const userId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId ??
      req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing",
      );
    }

    return String(userId);
  }

  // ============================================================
  // VERIFY CURRENT USER OWNS RESOURCE
  // ============================================================

  private verifyOwner(
    req: any,
    requestedUserId: string,
  ): void {
    const authenticatedUserId =
      this.getAuthenticatedUserId(req);

    if (
      String(authenticatedUserId) !==
      String(requestedUserId)
    ) {
      throw new UnauthorizedException(
        "You can only modify your own account",
      );
    }
  }
}