
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import AddProductForm from "../components/AddProductForm";

import {
  sellerApi,
} from "../services/sellerApi";

type EditProduct = {
  _id?: string;
  id?: string;
  [key: string]: any;
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<EditProduct | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProduct = useCallback(async () => {
    if (!id) {
      navigate("/seller/products", { replace: true });
      return;
    }

    let cancelled = false;

    try {
      setLoading(true);
      setProduct(null);

      const data = await sellerApi.getProductById(id);

      if (cancelled) return;

      console.log("EDIT PRODUCT DATA:", data);

      // Support common API response formats without changing
      // the existing sellerApi implementation.
      const result =
        data?.product ??
        data?.data?.product ??
        data?.data ??
        data;

      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("The product response was invalid.");
      }

      setProduct(result as EditProduct);
    } catch (error) {
      if (cancelled) return;

      console.error("LOAD PRODUCT ERROR:", error);

      window.alert("Failed to load product. Please try again.");

      navigate("/seller/products", { replace: true });
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    let active = true;

    async function fetchProduct() {
      if (!id) {
        navigate("/seller/products", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setProduct(null);

        const data = await sellerApi.getProductById(id);

        if (!active) return;

        console.log("EDIT PRODUCT DATA:", data);

        const result =
          data?.product ??
          data?.data?.product ??
          data?.data ??
          data;

        if (!result || typeof result !== "object" || Array.isArray(result)) {
          throw new Error("The product response was invalid.");
        }

        setProduct(result as EditProduct);
      } catch (error) {
        if (!active) return;

        console.error("LOAD PRODUCT ERROR:", error);

        window.alert("Failed to load product. Please try again.");

        navigate("/seller/products", { replace: true });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchProduct();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
        }}
        role="status"
      >
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
        }}
      >
        Product not found.
      </div>
    );
  }

  return (
    <AddProductForm
      mode="edit"
      productId={id}
      initialData={product}
    />
  );
}
