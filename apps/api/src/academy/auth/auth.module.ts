import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";

import {
  AcademyUser,
  AcademyUserSchema,
} from "./schemas/academy-user.schema";

import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

// ============================================================================
// FOCKIS ACADEMY AUTH MODULE
// ============================================================================

@Module({
  imports: [
    // ========================================================================
    // ACADEMY USER MODEL
    // ========================================================================

    MongooseModule.forFeature([
      {
        name: AcademyUser.name,
        schema: AcademyUserSchema,
      },
    ]),

    // ========================================================================
    // PASSPORT
    // ========================================================================

    PassportModule.register({
      defaultStrategy: "academy-jwt",
    }),

    // ========================================================================
    // ACADEMY JWT
    // ========================================================================
    //
    // IMPORTANT:
    // The exact same ACADEMY_JWT_SECRET must be used by:
    //
    // 1. AuthService when signing tokens
    // 2. JwtStrategy when verifying tokens
    //
    // ========================================================================

    JwtModule.register({
      secret: process.env.ACADEMY_JWT_SECRET,

      signOptions: {
        expiresIn: "7d",
      },
    }),
  ],

  // ========================================================================
  // CONTROLLERS
  // ========================================================================

  controllers: [
    AuthController,
  ],

  // ========================================================================
  // PROVIDERS
  // ========================================================================

  providers: [
    AuthService,
    JwtStrategy,
  ],

  // ========================================================================
  // EXPORTS
  // ========================================================================

  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    JwtModule,
  ],
})

// ============================================================================
// ACADEMY AUTH MODULE
// ============================================================================

export class AcademyAuthModule {}