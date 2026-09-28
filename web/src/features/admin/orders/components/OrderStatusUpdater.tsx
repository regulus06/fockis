import React from 'react';
import { adminOrderApi } from '../services/adminOrderApi';

const OrderStatusUpdater = ({ orderId }: any) => {
  const update = async (status: string) => {
    await adminOrderApi.updateStatus(orderId, status);
    alert('Status updated');
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => update('processing')}>
        Processing
      </button>

      <button onClick={() => update('shipped')}>
        Shipped
      </button>

      <button onClick={() => update('delivered')}>
        Delivered
      </button>
    </div>
  );
};

export default OrderStatusUpdater;