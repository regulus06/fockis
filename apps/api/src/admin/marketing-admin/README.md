# Fockis Marketing Admin Backend Replacement

This package replaces the mock `admin/marketing-admin` implementation with a MongoDB-backed Marketing Admin control layer.

## Files

Copy the `apps/api/src/admin/marketing-admin` directory into your NestJS API.

Do not replace the existing advertiser-facing `apps/api/src/marketing` services.

## AppModule

Import `MarketingAdminModule` in your existing admin/app module if it is not already imported:

```ts
import { MarketingAdminModule } from "./admin/marketing-admin/marketing-admin.module";
```

Then add `MarketingAdminModule` to the module imports.

## Authentication

`MarketingAdminGuard` expects your existing authentication layer to populate `req.user`.

It accepts your existing super-admin shapes:
- `user.isSuperAdmin === true`
- `user.role === "SUPER_ADMIN"`
- `user.role === "super_admin"`
- `user.permissions` containing `"*"`

Regular administrators need the exact marketing permission being used by the endpoint.

## Collections

Defaults:
- campaigns: `campaigns`
- ads: `advertisements`
- audit: `marketingauditevents`
- workflow: `marketingworkflowsettings`

You can override them with:
- `MARKETING_CAMPAIGNS_COLLECTION`
- `MARKETING_ADS_COLLECTION`
- `MARKETING_AUDIT_COLLECTION`
- `MARKETING_WORKFLOW_COLLECTION`

If your existing advertisement collection is named `ads`, set `MARKETING_ADS_COLLECTION=ads`.

## State transitions

The backend enforces the supplied transition matrix. Frontend buttons are never trusted.

Campaigns and ads:
- APPROVE: PENDING_REVIEW -> APPROVED
- PUBLISH: APPROVED/PAUSED -> ACTIVE
- REJECT: PENDING_REVIEW/APPROVED -> REJECTED
- PAUSE: ACTIVE/SCHEDULED -> PAUSED
- RESUME: PAUSED -> ACTIVE
- BLOCK: DRAFT/PENDING_REVIEW/APPROVED/SCHEDULED/ACTIVE/PAUSED -> BLOCKED
- UNBLOCK: BLOCKED -> PAUSED
- ARCHIVE: DRAFT/REJECTED/EXPIRED/PAUSED -> ARCHIVED

## Audit

Every completed status mutation records:
- actor
- action
- resource type
- resource ID
- reason
- note
- previous status
- new status
- timestamp

The two-admin approval workflow records the first approval separately and only performs the APPROVED transition after the second distinct administrator approves.

## Routes

Base path: `/admin/marketing-admin`

Campaigns, ads, workflow, permissions, campaign statuses, and audit routes are provided by `MarketingAdminController`.

Workflow supports both PATCH and PUT.
