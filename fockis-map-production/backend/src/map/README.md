# Backend integration

Import `MapModule` into the application module that already owns MongoDB and JWT authentication.

Example:

imports: [
  MongooseModule.forRoot(process.env.MONGODB_URI!),
  MapModule,
]

This module intentionally uses `AuthGuard("jwt")` so it plugs into a standard NestJS Passport JWT strategy. If the existing Fockis API registers a differently named JWT strategy, change only the guard name or reuse the existing authenticated guard.

The authenticated request must expose one of:
- `req.user.id`
- `req.user.userId`
- `req.user._id`

and either `req.user.role` or `req.user.roles`.

For management permissions, the supplied guard recognizes:
- SUPER_ADMIN
- super_admin
- admin
- MAP_ADMIN
- ADDRESS_ADMIN
- ADDRESS_MANAGER
- REGIONAL_MANAGER
- BUILDING_MANAGER

Adapt the role list to your authoritative Fockis roles. Do not rely on frontend button visibility for security.
