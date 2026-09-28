// backend/admin-travel/middleware/adminAuth.middleware.ts
//
// If your existing admin app already has an auth middleware (very likely,
// given features/admin/routes/AdminRouteGuard.tsx on the frontend implies a
// server-side counterpart), use that one instead and delete this file —
// it exists so this module is runnable standalone. Expects a JWT signed
// with { id, permissions } as the payload; adjust to match your real token
// shape.

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AdminAuthPayload {
  id: string;
  email?: string;
  permissions: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminAuthPayload;
    }
  }
}

const JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? "";

export function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing admin authorization token." });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminAuthPayload;
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired admin token." });
  }
}
