# Fockis Employer Center frontend scaffold

This is a structured frontend starter for the Employer Center.

## Integration requirements
1. Confirm the existing `apiClient` import path in `services/employerApi.ts`.
2. Mount `EmployerRoutes` under the authenticated `/careers/employer/*` route.
3. Replace `EmployerProtectedRoute` with your real auth/role check. It intentionally fails closed and redirects to login until integrated.
4. Implement backend endpoints and guards before enabling any management actions.
5. Connect placeholder components/pages to the typed API responses.
6. Add tests and run TypeScript/build checks in the actual Fockis repository.

Frontend role checks are UX only; all authorization must be repeated on the server.
