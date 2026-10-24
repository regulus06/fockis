
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
  Put,
  Query,
  Req,
  UnauthorizedException,
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
import { ChangeEmailDto } from "./dto/change-email.dto";
import { EmailChangeService } from "./services/email-change.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function createImageUploadInterceptor() {
  return FileInterceptor("file", {
    storage: diskStorage({
      destination: "./uploads",
      filename: (_req, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();

        const allowedExtensions = new Set([
          ".jpg",
          ".jpeg",
          ".png",
          ".webp",
          ".gif",
        ]);

        if (!allowedExtensions.has(extension)) {
          return callback(
            new BadRequestException("Unsupported image extension."),
            "",
          );
        }

        const filename =
          `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

        callback(null, filename);
      },
    }),
    limits: {
      fileSize: MAX_PROFILE_IMAGE_SIZE,
      files: 1,
    },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return callback(
          new BadRequestException(
            "Only JPEG, PNG, WebP, and GIF images are allowed.",
          ),
          false,
        );
      }

      callback(null, true);
    },
  });
}

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly blockVisibilityService: BlockVisibilityService,
    private readonly emailChangeService: EmailChangeService,
  ) {}

  // GET /users/me
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const userId = this.getAuthenticatedUserId(req);
    const profile = await this.usersService.getUserById(userId);

    // The account owner may see their own email address. This is added
    // only here (never in GET /users/:id), so other users can't read it.
    const account = await this.usersService.findById(userId);

    return {
      ...profile,
      email: account?.email ?? null,
    };
  }

  // GET /users/me/fockis-id
  @Get("me/fockis-id")
  @UseGuards(JwtAuthGuard)
  async getMyFockisId(@Req() req: any) {
    const userId = this.getAuthenticatedUserId(req);
    return this.usersService.getFockisIdAccessStatus(userId);
  }

  // GET /users/search/fockis-id?q=FK7Q2M8A
  @Get("search/fockis-id")
  @UseGuards(JwtAuthGuard)
  async searchByFockisId(
    @Query("q") query: string,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);

    return this.usersService.searchByFockisId(
      String(query || ""),
      currentUserId,
    );
  }

  // GET /users/me/profile
  @Get("me/profile")
  @UseGuards(JwtAuthGuard)
  getMyProfile(@Req() req: any) {
    const userId = this.getAuthenticatedUserId(req);
    return this.usersService.getUserById(userId);
  }

  // GET /users/search?q=john
  @Get("search")
  @UseGuards(JwtAuthGuard)
  searchUsers(
    @Query("q") query: string,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);

    return this.usersService.searchUsers(
      String(query || ""),
      currentUserId,
    );
  }

  // GET /users/fockis/:fockisId
  @Get("fockis/:fockisId")
  @UseGuards(JwtAuthGuard)
  async getUserByFockisId(
    @Param("fockisId") fockisId: string,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);

    let decodedFockisId: string;

    try {
      decodedFockisId = decodeURIComponent(String(fockisId || ""));
    } catch {
      throw new BadRequestException("Invalid Fockis ID encoding.");
    }

    return this.usersService.findByFockisId(
      decodedFockisId,
      currentUserId,
    );
  }

  // GET /users/:id/discover
  @Get(":id/discover")
  @UseGuards(JwtAuthGuard)
  async discoverUsers(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const authenticatedUserId = this.getAuthenticatedUserId(req);

    if (authenticatedUserId !== String(id)) {
      throw new ForbiddenException(
        "You can only discover users for your own account.",
      );
    }

    return this.usersService.getDiscoverUsers(authenticatedUserId);
  }

  // GET /users/:id
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getUser(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);

    const canView = await this.blockVisibilityService.canView(
      currentUserId,
      id,
    );

    if (!canView) {
      throw new ForbiddenException("You cannot view this profile.");
    }

    return this.usersService.getUserById(id);
  }

  // PATCH /users/:id
  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  updateUser(
    @Param("id") id: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: any,
  ) {
    this.verifyOwner(req, id);
    return this.usersService.updateUser(id, dto);
  }

  // PATCH /users/:id/profile-picture
  @Patch(":id/profile-picture")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createImageUploadInterceptor())
  uploadProfilePicture(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.verifyOwner(req, id);

    if (!file) {
      throw new BadRequestException(
        "A valid profile picture is required.",
      );
    }

    return this.usersService.updateUser(id, {
      profilePicture: `/uploads/${file.filename}`,
    });
  }

  // PATCH /users/:id/cover-photo
  @Patch(":id/cover-photo")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(createImageUploadInterceptor())
  uploadCoverPhoto(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    this.verifyOwner(req, id);

    if (!file) {
      throw new BadRequestException(
        "A valid cover photo is required.",
      );
    }

    return this.usersService.updateUser(id, {
      coverPhoto: `/uploads/${file.filename}`,
    });
  }

  // POST /users/:id/email-change/request
  // Requires authentication, account ownership, and the current password.
  @Post(":id/email-change/request")
  @UseGuards(JwtAuthGuard)
  async requestEmailChange(
    @Param("id") id: string,
    @Body() body: ChangeEmailDto,
    @Req() req: any,
  ) {
    this.verifyOwner(req, id);

    return this.emailChangeService.requestChange(
      id,
      body?.newEmail,
      body?.currentPassword,
    );
  }

  // POST /users/:id/email-change/verify
  // Updates the account email only after the verification code is valid.
  @Post(":id/email-change/verify")
  @UseGuards(JwtAuthGuard)
  async verifyEmailChange(
    @Param("id") id: string,
    @Body() body: { code?: string },
    @Req() req: any,
  ) {
    this.verifyOwner(req, id);

    return this.emailChangeService.verifyChange(
      id,
      String(body?.code ?? ""),
    );
  }

  // PUT /users/:id/password
  @Put(":id/password")
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Param("id") id: string,
    @Body() body: {
      currentPassword?: string;
      newPassword?: string;
    },
    @Req() req: any,
  ) {
    this.verifyOwner(req, id);

    if (
      typeof body?.currentPassword !== "string" ||
      typeof body?.newPassword !== "string" ||
      !body.currentPassword ||
      body.newPassword.length < 8
    ) {
      throw new BadRequestException(
        "Provide your current password and a new password of at least 8 characters.",
      );
    }

    return this.usersService.changePassword(
      id,
      body.currentPassword,
      body.newPassword,
    );
  }

  // DELETE /users/:id
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  deleteUser(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    this.verifyOwner(req, id);
    return this.usersService.deleteUser(id);
  }

  private getAuthenticatedUserId(req: any): string {
    const userId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId ??
      req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing.",
      );
    }

    return String(userId);
  }

  private verifyOwner(
    req: any,
    requestedUserId: string,
  ): void {
    const authenticatedUserId = this.getAuthenticatedUserId(req);

    if (authenticatedUserId !== String(requestedUserId)) {
      throw new ForbiddenException(
        "You can only modify your own account.",
      );
    }
  }
}
