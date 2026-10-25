
import { useCallback, useEffect, useState } from "react";
import { sellerApi } from "../services/sellerApi";

type Product = any;

type ProductResponse = {
  items?: Product[];
  products?: Product[];
  data?: Product[];
};

function normalizeProducts(response: unknown): Product[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const result = response as ProductResponse;

  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result.products)) return result.products;
  if (Array.isArray(result.data)) return result.data;

  return [];
}

export function useSellerProducts(storeId?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    const activeStoreId = storeId?.trim();

    if (
      !activeStoreId ||
      activeStoreId === "undefined" ||
      activeStoreId === "null"
    ) {
      setProducts([]);
      setError("Select or create a store to view its products.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the seller-specific endpoint, not the public storefront endpoint.
      const response: unknown =
        await sellerApi.getSellerProducts(activeStoreId);

      setProducts(normalizeProducts(response));
    } catch (err: unknown) {
      console.error("Failed to load seller products:", err);

      const requestError = err as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
        message?: string;
      };

      const message = requestError.response?.data?.message;

      setError(
        Array.isArray(message)
          ? message.join(", ")
          : message ||
              requestError.message ||
              "Unable to load products. Please try again."
      );

      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const createProduct = async (data: any) => {
    const activeStoreId = storeId?.trim();

    if (!activeStoreId) {
      throw new Error(
        "Select or create a store before adding a product."
      );
    }

    const product = await sellerApi.createProduct({
      ...data,
      storeId: activeStoreId,
    });

    await loadProducts();
    return product;
  };

  const updateProduct = async (id: string, data: any) => {
    const product = await sellerApi.updateProduct(id, data);
    await loadProducts();
    return product;
  };

  const deleteProduct = async (id: string) => {
    const result = await sellerApi.deleteProduct(id);
    await loadProducts();
    return result;
  };

  return {
    products,
    loading,
    error,
    reload: loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
