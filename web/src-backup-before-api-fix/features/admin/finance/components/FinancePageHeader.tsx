import type { ReactNode } from "react";

interface FinancePageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}

export default function FinancePageHeader({
  title,
  description,
  action,
  eyebrow = "FOCKIS ADMIN CENTER · FINANCE",
}: FinancePageHeaderProps) {
  return (
    <header className="finance-page-header">
      <div className="finance-page-header__content">
        <span className="finance-page-header__eyebrow">
          {eyebrow}
        </span>

        <h1>{title}</h1>

        {description && (
          <p>{description}</p>
        )}
      </div>

      {action && (
        <div className="finance-page-header__actions">
          {action}
        </div>
      )}
    </header>
  );
}