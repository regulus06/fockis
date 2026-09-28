# Fockis Shop ↔ Vapi live discovery

These files add a dedicated live Fockis Shop discovery layer without replacing the existing
Fockis AI discovery service.

## Files

Copy these into the same `apps/api/src/fockis-ai-admin/vapi/` area (or another folder of
your choice):

- `fockis-shop-discovery.types.ts`
- `fockis-shop-discovery.service.ts`
- `fockis-shop-discovery.controller.ts`
- `fockis-shop-discovery.module.ts`

The controller exposes:

`POST /admin/ai/vapi/tools`

It handles the current Vapi `message.type = "tool-calls"` webhook format and also accepts
the older `function-call` format. Vapi expects an HTTP 200 response with a `results` array
and matching `toolCallId` values for synchronous Function Tools.

## 1. Import the module

In the Nest module that owns your Fockis AI/Vapi feature (the module that already provides
`VapiService` and `AiDiscoveryService`), import:

```ts
import { FockisShopDiscoveryModule } from "./vapi/fockis-shop-discovery.module";

@Module({
  imports: [
    // keep your existing imports
    FockisShopDiscoveryModule,
  ],
})
export class FockisAiAdminModule {}
```

If your Vapi files live in a different folder, adjust only that import path.

Do not create a second `AiDiscoveryService`. The new controller uses `ModuleRef` to reuse
your existing discovery service for jobs, courses, programs, real estate, events and posts.

## 2. Environment variable

Your existing Vapi service already reads:

```env
VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL=
```

Set it to the PUBLIC HTTPS URL that reaches your Nest server:

```env
VAPI_FOCKIS_DISCOVERY_WEBHOOK_URL=https://YOUR-PUBLIC-DOMAIN/admin/ai/vapi/tools
```

Do not use:

```env
http://localhost:3000/...
```

Vapi cannot reach your Windows localhost directly. For local development, use your normal
public tunnel (for example, an HTTPS tunnel) or deploy the API.

## 3. Restart Nest

From the API directory:

```powershell
cd apps/api
npm run start:dev
```

You should see the new route in the Nest startup logs:

```text
Mapped {/admin/ai/vapi/tools, POST} route
```

## 4. Synchronize the Vapi tools

Your existing `VapiService.syncFockisDiscoveryTools()` already creates/updates the nine
Fockis discovery Function Tools and attaches them to the assistant.

After the new webhook URL is configured, use the existing Vapi status/sync operation you
already built.

The three Shop tools now query the live marketplace collections:

- `search_fockis_products`
- `search_fockis_stores`
- `search_fockis_businesses`

## 5. What the Shop tools return

Product searches are limited to:

```text
isActive: true
displayLocations contains "marketplace"
```

Products can be filtered by:

- natural-language query
- category
- city
- minimum price
- maximum price
- availability/in-stock language

Product results include:

- product name
- description
- price
- stock
- image
- category
- brand
- rating/reviews
- store name
- store slug
- store verification
- product URL
- legacy marketplace product URL
- store URL

The product URL is:

```text
/shop/products/:id
```

The existing marketplace product URL is also returned:

```text
/marketplace/product/:id
```

Store results include a direct:

```text
/shop/store/:slug
```

URL.

Business results include:

```text
/businesses/:id
```

and, when the business record exposes its Shop store slug:

```text
/shop/store/:slug
```

## 6. Expected conversation

A customer can now say:

> Find me a laptop under $800.

Vapi can call:

```json
{
  "query": "laptop",
  "maxPrice": 800,
  "limit": 8
}
```

The tool searches the current Fockis Shop database and returns real records.

If the customer asks:

> Where can I buy it?

The result already contains the store information and store URL, so Fockis AI can direct
the customer to that actual Fockis Shop store.

If the customer asks:

> Is it available?

The product tool recognizes availability/in-stock wording and adds a stock > 0 filter.

## 7. Test the webhook manually

After Nest is running, send a test request to the public webhook:

```powershell
$body = @{
  message = @{
    type = "tool-calls"
    toolCallList = @(
      @{
        id = "test-shop-1"
        name = "search_fockis_products"
        parameters = @{
          query = "laptop"
          maxPrice = 800
          limit = 5
        }
      }
    )
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "https://YOUR-PUBLIC-DOMAIN/admin/ai/vapi/tools" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

A successful response has this general shape:

```json
{
  "results": [
    {
      "toolCallId": "test-shop-1",
      "result": "{\"tool\":\"search_fockis_products\",...}"
    }
  ]
}
```

## Important

Do not replace your existing Fockis Shop product or store services. This layer reads the
same MongoDB collections as the marketplace and is intentionally read-only.

Vapi's current Function Tool protocol sends a `tool-calls` webhook and expects a 200 response
with `results[].toolCallId` matched to the incoming call. This implementation follows that
contract.
