import "../styles/StatCard.scss";
import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  icon?: ReactNode;
}

const StatCard = ({
  title,
  value,
  icon,
}: Props) => {
  return (
    <div className="stat-card">
      {icon && (
        <div className="stat-icon">
          {icon}
        </div>
      )}

      <div>
        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
};

export default StatCard;