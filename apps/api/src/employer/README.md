# Fockis Employer Center backend scaffold

This is a backend starter, not a production-certified implementation.

## Required integration before deployment
- Import `EmployerModule` into the existing NestJS AppModule only after checking module structure.
- Replace the placeholder EmployerAuthGuard with the project's actual JWT guard and request-user shape.
- Implement employer membership, tenant isolation, ownership and permission checks. Current guards fail closed.
- Complete every service/controller/DTO/schema marked TODO.
- Reuse existing Careers Job and Application schemas; do not create duplicate job/application collections.
- Implement employer verification review by an admin-only controller, separate from job approval.
- Store verification documents privately; add signature validation, malware scanning and signed URLs.
- Add audit events, rate limits, pagination, indexes, retention policies and automated tests.
- Validate Stripe webhooks server-side; never trust client subscription state.
- Run unit, e2e, lint, typecheck and production build tests in the target repository.

The `/employer/health` route is only a module smoke-test and does not indicate production readiness.
