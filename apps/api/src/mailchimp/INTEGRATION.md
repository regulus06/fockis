# NestJS integration

In your `apps/api/src/app.module.ts` add:

```ts
import { MailchimpModule } from "./mailchimp/mailchimp.module";

@Module({
  imports: [
    // existing modules...
    MailchimpModule,
  ],
})
export class AppModule {}
```

Do not put `MAILCHIMP_API_KEY` in the React `.env`.

## Security

The controller in this drop-in package is intentionally simple so it can fit
different Fockis auth architectures. Before production, protect the routes
with the same JWT/business-owner guards already used by your Marketing module.

For a business-facing route, the server should resolve the Mailchimp audience
from the authenticated `businessId`, rather than trusting an audience ID
submitted by the browser.

## Mailchimp setup

Create a Mailchimp API key in the Mailchimp account and store it in the
backend environment. The server prefix is the `usXX` prefix in your
Mailchimp account URL.

For a Fockis integration that accesses only your own Mailchimp account, an API
key is appropriate. If you later let each Fockis business connect its own
Mailchimp account, use Mailchimp OAuth 2 and store per-business credentials
securely instead of sharing one global API key.

## SMS

Do not treat the transactional SMS endpoint as a replacement for SMS
marketing. Transactional SMS is for event-driven messages such as order
updates and account/security messages. Marketing SMS requires the appropriate
Mailchimp SMS program, approval, country support, credits, and consent.
