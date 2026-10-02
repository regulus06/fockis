import { useWishlistStore } from '../store/wishlistStore';

export function useWishlist() {
  const productIds = useWishlistStore((s) => s.productIds);
  const toggle = useWishlistStore((s) => s.toggle);
  const has = useWishlistStore((s) => s.has);
  const clear = useWishlistStore((s) => s.clear);

  return { productIds, toggle, has, clear };
}
