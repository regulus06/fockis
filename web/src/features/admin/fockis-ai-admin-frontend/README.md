# Fockis AI & Vapi Admin Frontend

This frontend adds a dedicated AI administration domain under:

`web/src/features/admin/ai`

## Pages

- `/admin/ai`
- `/admin/ai/plans`
- `/admin/ai/users`
- `/admin/ai/conversations`
- `/admin/ai/tools`
- `/admin/ai/recommendations`
- `/admin/ai/special-ads`
- `/admin/ai/usage`
- `/admin/ai/settings`

## Important

The UI is designed to work with these backend endpoints:

- `GET /api/admin/ai/dashboard`
- `GET/PATCH /api/admin/ai/plans`
- `GET /api/admin/ai/users`
- `GET/PATCH /api/admin/ai/users/:userId/access`
- `GET/PATCH /api/admin/ai/conversations`
- `GET/PATCH /api/admin/ai/tools`
- `GET/PATCH /api/admin/ai/settings`
- `POST /api/admin/ai/emergency-disable`

The included pages have safe demo fallback data so the UI can be previewed before the backend is connected.

## Router integration

Inside your existing `AdminRoutes.tsx`, mount:

```tsx
<Route path="ai/*" element={<AiAdminRoutes />} />
```

Then import:

```tsx
import AiAdminRoutes from "../ai/routes/AiAdminRoutes";
```

Adjust the relative path if your existing router is in a different directory.

## Sidebar

Add an `AI & Vapi` navigation item pointing to:

`/admin/ai`

with child links:

- Overview
- Plans & Access
- Users
- Conversations
- Tools
- Recommendations
- Special Ads
- Usage
- Settings

The frontend intentionally keeps Vapi credentials out of React. Vapi session creation and permission enforcement should happen in the NestJS backend.
