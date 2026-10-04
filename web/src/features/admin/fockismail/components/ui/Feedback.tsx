import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";
import { cx } from "../../utils/format";

export function Skeleton({ width, height = 14, radius = 6, className }: { width?: number | string; height?: number; radius?: number; className?: string }) {
  return <span className={cx("fm-skeleton", className)} style={{ width: width ?? "100%", height, borderRadius: radius }} aria-hidden />;
}

export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="fm-skeleton-table" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => (
        <div className="fm-skeleton-table__row" key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} width={c === 0 ? "70%" : "50%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4, height = 120 }: { count?: number; height?: number }) {
  return (
    <div className="fm-grid fm-grid--cards" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="fm-card" key={i}>
          <Skeleton width="40%" />
          <Skeleton height={height - 50} className="fm-mt-12" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, body, action, compact }: EmptyStateProps) {
  return (
    <div className={cx("fm-empty", compact && "is-compact")}>
      <span className="fm-empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <div className="fm-empty__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="fm-error" role="alert">
      <Icon name="alert" />
      <div>
        <strong>Couldn't load this section.</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="fm-tooltip" tabIndex={0} aria-label={text}>
      {children}
      <span className="fm-tooltip__bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

export function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip text={text}>
      <Icon name="help" size={14} className="fm-muted" />
    </Tooltip>
  );
}

export function Notice({ tone = "info", children, icon }: { tone?: "info" | "warning" | "success"; children: ReactNode; icon?: IconName }) {
  return (
    <div className={cx("fm-notice", `fm-notice--${tone}`)}>
      <Icon name={icon ?? (tone === "warning" ? "alert" : tone === "success" ? "check" : "help")} size={16} />
      <div>{children}</div>
    </div>
  );
}

export function ProgressBar({ value, tone = "blue", label }: { value: number; tone?: "blue" | "green" | "amber" | "red"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className={cx("fm-progress", `fm-progress--${tone}`)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </span>
  );
}
