import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "../types/studio";

interface CartState {
  items: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "key"> & { key?: string }) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  lastAdded: string | null;
}

const CartContext = createContext<CartState | null>(null);

function storageKey(siteId: string | null) {
  return `fockis-site-cart:${siteId ?? "preview"}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Per-website shopping cart and wishlist persisted in the visitor's browser. */
export function CartProvider({ siteId, persist, children }: { siteId: string | null; persist: boolean; children: React.ReactNode }) {
  const key = storageKey(siteId);
  const [items, setItems] = useState<CartLine[]>(() => (persist ? read<CartLine[]>(key, []) : []));
  const [wishlist, setWishlist] = useState<string[]>(() => (persist ? read<string[]>(`${key}:wish`, []) : []));
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(key, JSON.stringify(items));
      localStorage.setItem(`${key}:wish`, JSON.stringify(wishlist));
    } catch {
      /* storage unavailable */
    }
  }, [items, wishlist, key, persist]);

  const add = useCallback((line: Omit<CartLine, "key"> & { key?: string }) => {
    const optKey = line.options ? Object.entries(line.options).sort().map(([k, v]) => `${k}=${v}`).join("&") : "";
    const k = line.key ?? `${line.kind}:${line.productId ?? line.name}:${optKey}`;
    setItems((prev) => {
      const existing = prev.find((p) => p.key === k);
      if (existing && line.kind === "product") {
        return prev.map((p) => (p.key === k ? { ...p, quantity: Math.min(99, p.quantity + line.quantity) } : p));
      }
      return [...prev, { ...line, key: line.kind === "custom-cake" ? `${k}:${Date.now()}` : k }];
    });
    setLastAdded(line.name);
    setOpen(true);
  }, []);

  const setQuantity = useCallback((k: string, quantity: number) => {
    setItems((prev) => (quantity <= 0 ? prev.filter((p) => p.key !== k) : prev.map((p) => (p.key === k ? { ...p, quantity: Math.min(99, quantity) } : p))));
  }, []);

  const value = useMemo<CartState>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: Math.round(items.reduce((n, i) => n + i.unitPrice * i.quantity, 0) * 100) / 100,
      add,
      setQuantity,
      remove: (k) => setItems((prev) => prev.filter((p) => p.key !== k)),
      clear: () => setItems([]),
      wishlist,
      toggleWishlist: (id) => setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])),
      open,
      setOpen,
      lastAdded,
    }),
    [items, wishlist, open, lastAdded, add, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("CartProvider missing");
  return ctx;
}
