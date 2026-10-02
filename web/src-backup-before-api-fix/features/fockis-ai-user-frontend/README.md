# Fockis AI User Frontend

Add to `web/.env`:

```env
VITE_VAPI_PUBLIC_KEY=your_public_key
VITE_VAPI_ASSISTANT_ID=your_assistant_id
VITE_API_URL=http://localhost:3000
VITE_FOCKIS_AI_USE_BACKEND=false
```

Install the browser SDK:

```bash
npm install @vapi-ai/web
```

Add the route:

```tsx
import FockisAiPage from "./features/ai/user/pages/FockisAiPage";

<Route path="/ai" element={<FockisAiPage />} />
```

The UI keeps conversation history in localStorage by default. Set
`VITE_FOCKIS_AI_USE_BACKEND=true` only when these optional endpoints exist:

GET `/ai/conversations`
POST `/ai/conversations`
PATCH `/ai/conversations/:id`
DELETE `/ai/conversations/:id`

Never expose `VAPI_PRIVATE_KEY` in Vite/frontend environment variables.
