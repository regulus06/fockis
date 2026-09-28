// backend/admin-travel/middleware/requirePermission.middleware.ts
//
// Mirrors features/admin/travel/routes/PermissionRouteGuard.tsx on the
// frontend — same permission strings (travel.dashboard.view,
// travel.applications.manage, etc.) so one permission list drives both.

import type { NextFunction, Request, Response } from "express";

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permissions = req.admin?.permissions ?? [];

    const allowed =
      permissions.includes("*") || permissions.includes(permission);

    if (!allowed) {
      res.status(403).json({
        message: `Missing required permission: ${permission}`,
      });
      return;
    }

    next();
  };
}
