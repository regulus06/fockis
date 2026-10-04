import type { MarketingIntegration } from "../types/mailchimp.types";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { timeAgo } from "../utils/format";

interface Props {
  integration: MarketingIntegration;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure: () => void;
}

export function IntegrationCard({ integration: i, onConnect, onDisconnect, onConfigure }: Props) {
  const native = i.category === "fockis";
  return (
    <article className="fm-intcard">
      <header>
        <span className="fm-intcard__mono" style={{ background: i.color }} aria-hidden>{i.monogram}</span>
        <div>
          <h3>{i.name}</h3>
          <Badge tone={i.connected ? "green" : "neutral"} dot>{i.connected ? "Connected" : "Not connected"}</Badge>
        </div>
      </header>
      <p>{i.description}</p>
      {i.connected && (
        <p className="fm-intcard__meta">
          {i.connectedAccount}
          {i.lastSyncAt && <><br />Synced {timeAgo(i.lastSyncAt)}</>}
        </p>
      )}
      <footer>
        {i.connected ? (
          <>
            <Button size="sm" icon="settings" onClick={onConfigure}>Configure</Button>
            {!native && <Button size="sm" variant="ghost" onClick={onDisconnect}>Disconnect</Button>}
          </>
        ) : (
          <Button size="sm" variant="primary" icon="plug" onClick={onConnect}>Connect</Button>
        )}
      </footer>
    </article>
  );
}
