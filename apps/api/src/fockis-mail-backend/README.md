# Fockis Mail Backend

NestJS/Mongoose backend for `web/src/features/admin/fockismail`.

## Registration

Add:

```ts
import { FockisMailModule } from "./fockis-mail/fockis-mail.module";
```

and `FockisMailModule` to `AppModule.imports`.

## Authentication

The application has a global JWT guard. These controllers intentionally do not create a second auth system. They use `req.user.sub`, `req.user.id`, or `req.user._id` and reject requests without a valid ObjectId.

## Workspace

The active workspace can be supplied with:

`x-fockis-mail-workspace: <workspace-id-or-slug>`

If absent, the API uses the authenticated user's `workspaceId`, otherwise `default`.

## Important

Campaign `POST /fockis-mail/campaigns/:id/send` currently queues/marks the campaign as sent in MongoDB. Real email delivery should be connected to your chosen provider (SMTP, Resend, SendGrid, Amazon SES, etc.) after confirming the provider and credentials. No email credentials are hard-coded.
