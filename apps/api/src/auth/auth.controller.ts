import {
  Controller,
  Post,
  Body,
  Req,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  AuthService,
} from "./auth.service";

import {
  CreateUserDto,
} from "../dto/create-user.dto";

import {
  LoginDto,
} from "../dto/login.dto";

import {
  Public,
} from "./public.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // ============================================================
  // REGISTER
  // POST /auth/register
  // ============================================================

  @Public()
  @Post("register")
  register(
    @Body() body: CreateUserDto,
  ) {
    return this.authService.register(
      body.username,
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      body.countryCode,
    );
  }

  // ============================================================
  // LOGIN
  // POST /auth/login
  // ============================================================

  @Public()
  @Post("login")
  login(
    @Body() body: LoginDto,
    @Req() request: Request,
  ) {
    console.log(
      "🔥 LOGIN CONTROLLER HIT",
    );

    // Never log passwords.
    console.log(
      "Login email:",
      body.email,
    );

    return this.authService.login(
      body.email,
      body.password,
      request,
    );
  }
}