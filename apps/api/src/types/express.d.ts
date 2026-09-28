/* ============================================================================
   FOCKIS EXPRESS TYPE EXTENSIONS

   Adds the authenticated JWT user to Express Request.

   This allows controllers to safely use:

     req.user

   while remaining compatible with:

     isolatedModules
     emitDecoratorMetadata
============================================================================ */

import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id?: string;
      _id?: string;
      userId?: string;
      sub?: string;

      [key: string]: unknown;
    };
  }
}

export {};