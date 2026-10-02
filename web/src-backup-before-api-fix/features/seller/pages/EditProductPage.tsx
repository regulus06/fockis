import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useNavigate,
} from "react-router-dom";

import AddProductForm from "../components/AddProductForm";

import {
  sellerApi,
} from "../services/sellerApi";


export default function EditProductPage() {

  const {
    id,
  } = useParams<{ id: string }>();

  const navigate =
    useNavigate();


  const [
    product,
    setProduct
  ] =
  useState<any>(null);


  const [
    loading,
    setLoading
  ] =
  useState(true);


  useEffect(() => {

    if (!id) {

      navigate(
        "/seller/products"
      );

      return;

    }

    loadProduct();

  }, [id]);


  async function loadProduct() {

    try {

      setLoading(true);


      const data =
        await sellerApi.getProductById(id!);


      console.log(
        "EDIT PRODUCT DATA:",
        data
      );


      setProduct(data);

    }
    catch (error) {

      console.error(
        "LOAD PRODUCT ERROR:",
        error
      );


      alert(
        "Failed to load product"
      );


      navigate(
        "/seller/products"
      );

    }
    finally {

      setLoading(false);

    }

  }


  if (loading) {

    return (

      <div
        style={{
          padding: "40px",
          textAlign: "center",
        }}
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

        Product not found

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