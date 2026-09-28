# Fockis AI Backend

This module matches the frontend in `web/src/features/ai/`.

## Endpoints

- `GET /ai/credits`
- `POST /ai/jobs`
- `GET /ai/jobs`
- `GET /ai/jobs/:id`
- `POST /ai/jobs/:id/cancel`

The controller expects your existing JWT/auth guard to populate:

`req.user.id`, `req.user.userId`, or `req.user.sub`.

## AppModule

Import `AiModule` in your existing `apps/api/src/app.module.ts`:

```ts
import { AiModule } from "./ai/ai.module";

@Module({
  imports: [
    // existing modules...
    AiModule,
  ],
})
export class AppModule {}
```

Do not replace your existing AppModule; add the import alongside the modules you already have.

## Dependencies

This module expects the normal NestJS/Mongoose dependencies already used by the project:

- @nestjs/common
- @nestjs/mongoose
- mongoose
- class-validator
- class-transformer

## Provider architecture

`providers/ai-provider.interface.ts` defines the provider contract.
`AiProviderFactory` is the switching point.

The included MockAiProvider exists only to verify the frontend/backend contract.
Replace it with real provider adapters and keep provider API keys on the server.

For production long-running video jobs, replace the direct `processJob()` call in `AiService` with BullMQ/Redis. The MongoDB job model and frontend polling contract can remain the same.
