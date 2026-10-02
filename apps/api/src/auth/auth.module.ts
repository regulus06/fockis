import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  ConfigModule,
  ConfigService,
} from "@nestjs/config";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

import { MfaService } from "./mfa.service";

import { AuthRegistrationService } from "./auth-registration.service";
import { AuthLoginService } from "./auth-login.service";
import { AuthTokenService } from "./auth-token.service";
import { AuthSecurityService } from "./auth-security.service";

import { UsersModule } from "../users/users.module";

import {
  AdminRole,
  AdminRoleSchema,
} from "../admin/roles/admin-role.schema";

import {
  User,
  UserSchema,
} from "../users/user.schema";

@Module({
  imports: [
    UsersModule,

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: AdminRole.name,
        schema: AdminRoleSchema,
      },
    ]),

    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (
        configService: ConfigService,
      ) => {
        const jwtSecret =
          configService.get<string>("JWT_SECRET");

        if (
          !jwtSecret ||
          jwtSecret.trim().length < 32
        ) {
          throw new Error(
            "SECURITY ERROR: JWT_SECRET is missing or too short. JWT_SECRET must be at least 32 characters.",
          );
        }

        return {
          secret: jwtSecret.trim(),

          signOptions: {
            expiresIn: "7d",
          },
        };
      },
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    AuthRegistrationService,
    AuthLoginService,
    AuthTokenService,
    AuthSecurityService,
    JwtStrategy,
    MfaService,
  ],

  exports: [
    AuthService,
    JwtModule,
    MfaService,
  ],
})
export class AuthModule {}