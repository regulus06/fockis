import { useEffect, useState } from 'react';
import type { Order } from '../types/order.types';
import { getOrderById, listMyOrders } from '../services/orderApi';

export interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

export interface UseOrderResult {
  order: Order | null;
  loading: boolean;
  error: string | null;
}

export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    listMyOrders()
      .then((res) => {
        if (cancelled) return;

        setOrders(Array.isArray(res) ? res : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setOrders([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load orders.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { orders, loading, error };
}

export function useOrder(
  orderId: string | undefined,
): UseOrderResult {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setOrder(null);
    setError(null);

    if (!orderId) {
      setLoading(false);
      setError('An order ID is required.');
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    getOrderById(orderId)
      .then((res) => {
        if (cancelled) return;

        if (!res) {
          setOrder(null);
          setError('Order not found.');
          return;
        }

        setOrder(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setOrder(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load order.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return { order, loading, error };
}
