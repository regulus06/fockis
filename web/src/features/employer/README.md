# Fockis Employer Center

Routes live under `/careers/employer/*` (mounted in `App.tsx` → `routes/EmployerRoutes.tsx`).
Every page renders inside `components/EmployerLayout.tsx` (sidebar, top bar, mobile drawer, toasts).

| Route | Page |
| --- | --- |
| `/careers/employer` | Dashboard |
| `/jobs`, `/jobs/new`, `/jobs/:jobId`, `/jobs/:jobId/edit` | Job listings, 4-step create/edit, details |
| `/applicants`, `/applicants/:applicationId` | Applications, applicant details |
| `/candidates` | Candidates (people who applied to your jobs) |
| `/interviews` | Interviews |
| `/profile`, `/verification`, `/team` | Company profile, verification, team |
| `/analytics`, `/resources`, `/billing`, `/settings` | Analytics, resources, billing, settings |

## Backend (apps/api/src/careers)

- Existing endpoints reused: `POST/PATCH/DELETE /careers/:id` (jobs), `PATCH /careers/applications/:id/status`, `POST /uploads`.
- New: `EmployerController` (`/employer/*`) + `EmployerService`, schemas `employer-company` and `employer-interview`.
- Jobs support `applicationMethod` (`fockis` | `external`) and `applicationUrl`. External jobs redirect
  “Apply Now” to the URL (see `features/careers/utils/externalApply.ts`) and are refused by the Fockis form.

## Structure

- `services/employerApi.ts` — typed API calls (uses the careers `apiClient`).
- `hooks/useEmployerQuery.ts` — loading/error/refetch for every page; domain hooks wrap it.
- `store/` — `employerStore` (account, company, role), `employerNotificationStore` (toasts).
- `components/shared/` — modal, confirm dialog, states, pagination, badges, stat card, menus, form field.
- `components/charts/` — SVG charts (no extra dependencies).
- `styles/_tokens.scss` + `EmployerShared.module.scss` — design tokens and primitives.

Role checks in the UI are convenience only; the backend enforces them in `EmployerService`.
