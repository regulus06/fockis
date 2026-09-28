import React from "react";
import { useOrderTracking } from "../hooks/useOrderTracking";

import "../styles/OrderTrackingBadge.scss";

interface Props {
  orderId: string;
}

const OrderTrackingBadge: React.FC<Props> = ({ orderId }) => {

  const { status } = useOrderTracking(orderId);

  // useOrderTracking may not have resolved a status yet (loading /
  // no data), and status.toUpperCase() would throw on undefined.
  const safeStatus = status ?? "pending";

  const variant =
    safeStatus === "delivered"
      ? "delivered"
      : safeStatus === "shipped"
      ? "shipped"
      : "pending";

  return (
    <div className={`order-tracking-badge order-tracking-badge--${variant}`}>
      {safeStatus.toUpperCase()}
    </div>
  );
};

export default OrderTrackingBadge;