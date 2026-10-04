import { Link } from "react-router-dom";
import type { CreditBalance, CreditChannel, CreditCheck, CreditThresholds } from "../types/platform.types";
import { CHANNEL_NAME, includedOf, levelOf, remainingOf, usedOf } from "../utils/credits";
import { formatNumber } from "../utils/format";
import { Icon } from "./ui/Icon";
import { Button, LinkButton } from "./ui/Button";
import { MARKETING_ROUTES } from "./navigation";
import { cx } from "../utils/format";

/** Remaining/used/included with a progress bar and a level-aware color. */
export function CreditMeter({ balance, channel, thresholds, compact }: { balance: CreditBalance; channel: CreditChannel; thresholds: CreditThresholds; compact?: boolean }) {
  const remaining = remainingOf(balance, channel);
  const included = includedOf(balance, channel);
  const used = usedOf(balance, channel);
  const level = levelOf(balance, channel, thresholds);
  const pct = included ? Math.min(100, (remaining / included) * 100) : 0;
  return (
    <div className={cx("fm-meter", `is-${level}`, compact && "is-compact")}>
      <div className="fm-meter__head">
        <span className="fm-meter__label"><Icon name={channel === "email" ? "mail" : "message"} size={15} /> {CHANNEL_NAME[channel]} credits</span>
        {level !== "normal" && <span className="fm-meter__flag">{level === "critical" ? "Exhausted" : "Low"}</span>}
      </div>
      <p className="fm-meter__value">
        <strong>{formatNumber(remaining)}</strong> <span>/ {formatNumber(included)} remaining</span>
      </p>
      <span className="fm-meter__track" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${CHANNEL_NAME[channel]} credits remaining`}>
        <span style={{ width: `${pct}%` }} />
      </span>
      {!compact && (
        <dl className="fm-meter__stats">
          <div><dt>Used</dt><dd>{formatNumber(used)}</dd></div>
          <div><dt>Included</dt><dd>{formatNumber(balance[channel === "email" ? "emailCreditsIncluded" : "smsCreditsIncluded"])}</dd></div>
          <div><dt>Purchased</dt><dd>{formatNumber(balance[channel === "email" ? "emailCreditsBonus" : "smsCreditsBonus"])}</dd></div>
          <div><dt>Used %</dt><dd>{included ? Math.round((used / Math.max(included, used + remaining)) * 100) : 0}%</dd></div>
        </dl>
      )}
    </div>
  );
}

/** Low/critical warning. Renders nothing at normal levels. */
export function CreditAlert({ balance, channel, thresholds, onBuy }: { balance: CreditBalance; channel: CreditChannel; thresholds: CreditThresholds; onBuy?: () => void }) {
  const level = levelOf(balance, channel, thresholds);
  if (level === "normal") return null;
  const remaining = remainingOf(balance, channel);
  const name = CHANNEL_NAME[channel];
  return (
    <div className={cx("fm-creditalert", `is-${level}`)} role={level === "critical" ? "alert" : "status"}>
      <Icon name="alert" size={18} />
      <div>
        <strong>{level === "critical" ? `${name} credits exhausted` : `${name} credits are running low`}</strong>
        <p>{level === "critical" ? `You have 0 ${name} credits remaining. ${channel === "email" ? "Campaigns" : "Texts"} can't send until you add more.` : `Only ${formatNumber(remaining)} ${name} credits remain.`}</p>
      </div>
      <div className="fm-creditalert__actions">
        {onBuy ? <Button size="sm" variant="primary" onClick={onBuy}>Buy {name} credits</Button> : <LinkButton size="sm" variant="primary" to={MARKETING_ROUTES.buyCredits(channel)}>Buy {name} credits</LinkButton>}
        {level === "critical" && <LinkButton size="sm" to={MARKETING_ROUTES.plans}>Upgrade plan</LinkButton>}
      </div>
    </div>
  );
}

/** Blocks a send when credits are short, explaining the exact shortfall. */
export function CreditGate({ check, onBuy, onEditAudience }: { check: CreditCheck; onBuy: () => void; onEditAudience: () => void }) {
  const name = CHANNEL_NAME[check.channel];
  if (check.sufficient) {
    return (
      <div className="fm-creditgate is-ok">
        <Icon name="check" size={16} />
        <p>This send uses about <strong>{formatNumber(check.required)}</strong> {name} credits. You have <strong>{formatNumber(check.remaining)}</strong>, leaving {formatNumber(check.remaining - check.required)}.</p>
      </div>
    );
  }
  return (
    <div className="fm-creditgate is-blocked" role="alert">
      <div className="fm-creditgate__head">
        <Icon name="alert" size={18} />
        <strong>Not enough {name} credits to send this campaign.</strong>
      </div>
      <dl className="fm-creditgate__math">
        <div><dt>Campaign requires</dt><dd>{formatNumber(check.required)}</dd></div>
        <div><dt>Your balance</dt><dd>{formatNumber(check.remaining)}</dd></div>
        <div className="is-short"><dt>Shortfall</dt><dd>{formatNumber(check.shortfall)}</dd></div>
      </dl>
      <div className="fm-row fm-row--wrap">
        <Button variant="primary" size="sm" icon="plus" onClick={onBuy}>Buy {name} credits</Button>
        <LinkButton size="sm" to={MARKETING_ROUTES.plans}>Upgrade plan</LinkButton>
        <Button size="sm" variant="ghost" onClick={onEditAudience}>Edit audience</Button>
      </div>
    </div>
  );
}

export function CreditPill({ balance, channel, thresholds }: { balance: CreditBalance; channel: CreditChannel; thresholds: CreditThresholds }) {
  const level = levelOf(balance, channel, thresholds);
  return (
    <Link to={channel === "email" ? MARKETING_ROUTES.emailCredits : MARKETING_ROUTES.smsCredits} className={cx("fm-creditpill", `is-${level}`)} title={`${CHANNEL_NAME[channel]} credits remaining`}>
      <Icon name={channel === "email" ? "mail" : "message"} size={13} />
      {formatNumber(remainingOf(balance, channel))}
    </Link>
  );
}
