# Fockis AI Admin Backend

This module matches the Fockis AI Admin frontend.

## Routes

With NestJS global prefix `api`, these become:

- GET /api/admin/ai/dashboard
- GET /api/admin/ai/plans
- POST /api/admin/ai/plans
- PATCH /api/admin/ai/plans/:id
- GET /api/admin/ai/users
- GET /api/admin/ai/users/:userId/access
- PATCH /api/admin/ai/users/:userId/access
- GET /api/admin/ai/conversations
- PATCH /api/admin/ai/conversations/:id
- GET /api/admin/ai/tools
- POST /api/admin/ai/tools
- PATCH /api/admin/ai/tools/:id
- GET /api/admin/ai/recommendations
- GET /api/admin/ai/special-ads
- GET /api/admin/ai/usage
- GET /api/admin/ai/settings
- PATCH /api/admin/ai/settings
- POST /api/admin/ai/emergency-disable
- GET /api/admin/ai/vapi/status
- GET /api/admin/ai/vapi/assistants
- GET /api/admin/ai/vapi/assistants/:id

## AppModule

Import the module:

```ts
import { AiAdminModule } from "./ai/ai-admin.module";

@Module({
  imports: [
    // existing modules...
    AiAdminModule,
  ],
})
export class AppModule {}
```

If your module is copied under another folder, adjust the import path.

## Environment

Add:

```env
VAPI_PRIVATE_KEY=your_vapi_private_key
VAPI_BASE_URL=https://api.vapi.ai
VAPI_ASSISTANT_ID=your_default_assistant_id
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
```

Do not expose VAPI_PRIVATE_KEY to the React frontend.

## Important

This module intentionally reads the existing MongoDB `users` collection directly for the admin user table. That avoids requiring a specific User schema path and prevents changing the existing user module.

The AI access service is the backend authority for AI feature access. The frontend should not make the final access decision.

Before production, protect every admin controller with the same authentication/admin permission guards already used by your Fockis Admin module.
