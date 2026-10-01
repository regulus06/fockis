import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  sellerApi,
} from "../services/sellerApi";

import "../styles/AddProductForm.scss";


type Category = {
  _id?: string;
  slug?: string;
  name: string;
  isActive?: boolean;
};


type AddProductFormProps = {
  mode?: "create" | "edit";
  productId?: string;
  initialData?: any;
};


/*
 * Legacy / junk category names that should never be selectable.
 */
const LEGACY_CATEGORY_NAMES = new Set([
  "other",
  "others",
  "garbage",
  "old",
  "old category",
  "old-category",
  "uncategorized",
  "un-categorized",
  "uncategorised",
  "un-categorised",
  "default",
  "unknown",
  "test",
  "testing",
  "demo",
]);


function isSelectableCategory(
  category: Category,
): boolean {

  const name =
    String(
      category?.name ?? "",
    )
      .trim()
      .toLowerCase();

  if (!name) {
    return false;
  }

  if (
    LEGACY_CATEGORY_NAMES.has(
      name,
    )
  ) {
    return false;
  }

  return true;
}


export default function AddProductForm({
  mode = "create",
  productId,
  initialData,
}: AddProductFormProps) {

  const navigate =
    useNavigate();


  // =====================================================
  // CATEGORIES
  // =====================================================

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([]);

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] =
    useState(true);


  // =====================================================
  // STORES
  // =====================================================

  const [
    stores,
    setStores,
  ] =
    useState<any[]>([]);

  const [
    selectedStore,
    setSelectedStore,
  ] =
    useState("");


  // =====================================================
  // IMAGE
  // =====================================================

  const [
    image,
    setImage,
  ] =
    useState<File | null>(null);

  const [
    preview,
    setPreview,
  ] =
    useState("");

  const [
    uploading,
    setUploading,
  ] =
    useState(false);


  // =====================================================
  // VISIBILITY
  // =====================================================

  const [
    locations,
    setLocations,
  ] =
    useState<string[]>([
      "marketplace",
    ]);

  const [
    feedDays,
    setFeedDays,
  ] =
    useState(3);


  // =====================================================
  // SHIPPING
  // =====================================================

  const [
    freeShipping,
    setFreeShipping,
  ] =
    useState(false);

  const [
    fastDelivery,
    setFastDelivery,
  ] =
    useState(false);


  // =====================================================
  // FORM
  // =====================================================

  const [
    form,
    setForm,
  ] =
    useState({
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category: "",
    });


  // =====================================================
  // DISCOUNT
  // =====================================================

  const [
    discount,
    setDiscount,
  ] =
    useState(0);


  // =====================================================
  // SUGGEST CATEGORY
  // =====================================================

  const [
    suggestCategoryOpen,
    setSuggestCategoryOpen,
  ] =
    useState(false);

  const [
    suggestCategoryName,
    setSuggestCategoryName,
  ] =
    useState("");

  const [
    suggestCategoryStatus,
    setSuggestCategoryStatus,
  ] =
    useState<
      "idle" |
      "submitting" |
      "success" |
      "error"
    >("idle");

  const [
    suggestCategoryError,
    setSuggestCategoryError,
  ] =
    useState("");


  async function handleSuggestCategory() {

    const trimmed =
      suggestCategoryName.trim();

    if (!trimmed) {

      setSuggestCategoryStatus(
        "error",
      );

      setSuggestCategoryError(
        "Enter a category name first",
      );

      return;
    }

    try {

      setSuggestCategoryStatus(
        "submitting",
      );

      setSuggestCategoryError("");

      /*
       * Optional sellerApi method.
       *
       * Add this to sellerApi if you want category
       * suggestions to be submitted to the backend.
       */
      if (
        typeof (sellerApi as any)
          .suggestCategory ===
        "function"
      ) {

        await (
          sellerApi as any
        ).suggestCategory(
          trimmed,
        );

      }

      setSuggestCategoryStatus(
        "success",
      );

      setSuggestCategoryName("");

    } catch (error) {

      console.error(
        "CATEGORY SUGGESTION ERROR:",
        error,
      );

      setSuggestCategoryStatus(
        "error",
      );

      setSuggestCategoryError(
        "Couldn't submit your suggestion. Please try again.",
      );
    }
  }


  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  useEffect(() => {

    void loadCategories();

  }, []);


  async function loadCategories() {

    try {

      setCategoriesLoading(true);

      /*
       * Categories are now loaded through sellerApi.
       *
       * If sellerApi does not currently expose
       * getCategories(), add it there.
       */
      const data =
        await (
          sellerApi as any
        ).getCategories();

      const categoryList =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.categories)
            ? data.categories
            : [];

      const selectableCategories =
        categoryList
          .filter(
            (category: Category) =>
              category.isActive !== false,
          )
          .filter(
            isSelectableCategory,
          );

      setCategories(
        selectableCategories,
      );

    } catch (error) {

      console.error(
        "CATEGORY LOAD ERROR:",
        error,
      );

      setCategories([]);

    } finally {

      setCategoriesLoading(
        false,
      );

    }
  }


  // =====================================================
  // LOAD STORES
  // =====================================================

  useEffect(() => {

    void loadStores();

  }, []);


  async function loadStores() {

    try {

      const data =
        await sellerApi.getMyStores();

      const storeList =
        Array.isArray(data)
          ? data
          : [];

      setStores(
        storeList,
      );


      if (
        mode === "edit" &&
        initialData
      ) {

        const productStoreId =
          initialData.storeId?._id ??
          initialData.storeId ??
          "";

        if (productStoreId) {

          setSelectedStore(
            String(
              productStoreId,
            ),
          );
        }

      } else if (
        storeList.length > 0
      ) {

        const firstStoreId =
          storeList[0]?._id;

        if (firstStoreId) {

          setSelectedStore(
            String(
              firstStoreId,
            ),
          );
        }
      }

    } catch (error) {

      console.error(
        "STORE LOAD ERROR:",
        error,
      );
    }
  }


  // =====================================================
  // LOAD EDIT DATA
  // =====================================================

  useEffect(() => {

    if (
      mode !== "edit" ||
      !initialData
    ) {
      return;
    }


    setForm({

      name:
        String(
          initialData.name ?? "",
        ),

      description:
        String(
          initialData.description ?? "",
        ),

      price:
        Number(
          initialData.price,
        ) || 0,

      stock:
        Number(
          initialData.stock,
        ) || 0,

      category:
        String(
          initialData.category ?? "",
        ),
    });


    const productStoreId =
      initialData.storeId?._id ??
      initialData.storeId ??
      "";

    if (productStoreId) {

      setSelectedStore(
        String(
          productStoreId,
        ),
      );
    }


    const productLocations =
      Array.isArray(
        initialData.displayLocations,
      )
        ? initialData.displayLocations
        : ["marketplace"];


    setLocations(
      productLocations.map(
        (location: unknown) =>
          String(location),
      ),
    );


    setFeedDays(
      Number(
        initialData.feedDays,
      ) || 3,
    );


    setFreeShipping(
      Boolean(
        initialData.freeShipping,
      ),
    );


    setFastDelivery(
      Boolean(
        initialData.fastDelivery,
      ),
    );


    setDiscount(
      Number(
        initialData.discount,
      ) || 0,
    );


    if (
      Array.isArray(
        initialData.images,
      ) &&
      initialData.images.length > 0
    ) {

      const existingImage =
        initialData.images[0];

      if (existingImage) {

        setPreview(
          getImageUrl(
            String(
              existingImage,
            ),
          ),
        );
      }
    }

  }, [
    initialData,
    mode,
  ]);


  // =====================================================
  // IMAGE URL
  // =====================================================

  function getImageUrl(
    imageUrl: string,
  ): string {

    if (!imageUrl) {
      return "";
    }

    if (
      imageUrl.startsWith(
        "http",
      )
    ) {
      return imageUrl;
    }

    if (
      imageUrl.startsWith(
        "/",
      )
    ) {

      return (
        FOCKIS_API_URL +
        imageUrl
      );
    }

    return (
      FOCKIS_API_URL + "/uploads/" +
      imageUrl
    );
  }


  // =====================================================
  // LOCATION TOGGLE
  // =====================================================

  function toggleLocation(
    value: string,
  ) {

    setLocations(
      (prev) => {

        if (
          prev.includes(value)
        ) {

          return prev.filter(
            (item) =>
              item !== value,
          );
        }

        return [
          ...prev,
          value,
        ];
      },
    );
  }


  // =====================================================
  // IMAGE SELECT
  // =====================================================

  function handleImage(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {

    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    setImage(file);

    setPreview(
      URL.createObjectURL(
        file,
      ),
    );
  }


  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  async function uploadProductImage(): Promise<string> {

    if (!image) {
      return "";
    }

    try {

      setUploading(true);

      const formData =
        new FormData();

      formData.append(
        "file",
        image,
      );

      const uploaded: any =
        await sellerApi.uploadImage(
          formData,
        );

      console.log(
        "IMAGE UPLOAD RESULT:",
        uploaded,
      );

      let imageUrl = "";

      if (
        typeof uploaded ===
        "string"
      ) {

        imageUrl =
          uploaded;

      } else if (
        uploaded
      ) {

        imageUrl =
          uploaded.url ||
          uploaded.path ||
          uploaded.file ||
          "";
      }

      if (
        !imageUrl ||
        imageUrl.includes(
          "undefined",
        )
      ) {

        throw new Error(
          "Invalid image URL",
        );
      }

      if (
        !imageUrl.startsWith(
          "/",
        ) &&
        !imageUrl.startsWith(
          "http",
        )
      ) {

        imageUrl =
          "/uploads/" +
          imageUrl;
      }

      return imageUrl;

    } catch (error) {

      console.error(
        "IMAGE UPLOAD ERROR:",
        error,
      );

      throw error;

    } finally {

      setUploading(false);
    }
  }


  // =====================================================
  // VALIDATION
  // =====================================================

  function validateProduct(): string {

    if (!selectedStore) {
      return "Please select a store";
    }

    if (!form.name.trim()) {
      return "Product name is required";
    }

    if (form.price <= 0) {
      return "Price must be greater than 0";
    }

    if (form.stock < 0) {
      return "Stock cannot be negative";
    }

    if (!form.category) {
      return "Please select a category";
    }

    const categoryExists =
      categories.some(
        (category) =>
          category.name ===
          form.category,
      );

    if (!categoryExists) {
      return "Please select a valid category";
    }

    if (
      discount < 0 ||
      discount > 100
    ) {
      return "Discount must be between 0 and 100";
    }

    if (
      locations.length === 0
    ) {
      return "Select at least one visibility location";
    }

    if (
      locations.includes("feed") &&
      feedDays < 1
    ) {
      return "Feed days must be at least 1";
    }

    return "";
  }


  // =====================================================
  // SUBMIT
  // =====================================================

  async function handleSubmit(
    e?: React.FormEvent,
  ) {

    e?.preventDefault();

    try {

      const validation =
        validateProduct();

      if (validation) {

        alert(
          validation,
        );

        return;
      }

      setUploading(true);

      let images: string[] =
        Array.isArray(
          initialData?.images,
        )
          ? initialData.images.map(
              (item: unknown) =>
                String(item),
            )
          : [];


      if (image) {

        const imageUrl =
          await uploadProductImage();

        if (imageUrl) {

          images = [
            imageUrl,
          ];
        }
      }


      const payload: any = {

        storeId:
          selectedStore,

        name:
          form.name.trim(),

        description:
          form.description.trim(),

        price:
          Number(
            form.price,
          ),

        stock:
          Number(
            form.stock,
          ),

        category:
          form.category,

        discount:
          Number(
            discount,
          ) || 0,

        images,

        freeShipping,

        fastDelivery,

        displayLocations:
          locations,
      };


      if (
        locations.includes(
          "feed",
        )
      ) {

        payload.feedDays =
          Number(
            feedDays,
          );
      }


      console.log(
        mode === "edit"
          ? "UPDATE PRODUCT PAYLOAD:"
          : "CREATE PRODUCT PAYLOAD:",
        payload,
      );


      if (
        mode === "edit" &&
        productId
      ) {

        await sellerApi.updateProduct(
          productId,
          payload,
        );

        alert(
          "Product updated successfully",
        );

      } else {

        await sellerApi.createProduct(
          payload,
        );

        alert(
          "Product created successfully",
        );
      }


      navigate(
        "/seller/products",
      );

    } catch (error: any) {

      console.error(
        "PRODUCT SAVE ERROR:",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.message ||
        (
          mode === "edit"
            ? "Failed to update product"
            : "Failed to create product"
        ),
      );

    } finally {

      setUploading(false);
    }
  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="seller-page">

      <div className="seller-header">

        <h1>
          {
            mode === "edit"
              ? "Edit Product"
              : "Create Product"
          }
        </h1>

        <p>
          {
            mode === "edit"
              ? "Update your product"
              : "Attach products to your store"
          }
        </p>

      </div>


      <div className="seller-grid">

        <div className="seller-card">

          <h2>
            {
              mode === "edit"
                ? "Edit Product"
                : "Add New Product"
            }
          </h2>


          <label>
            Select Store
          </label>

          <select
            value={
              selectedStore
            }
            onChange={(e) =>
              setSelectedStore(
                e.target.value,
              )
            }
            required
          >

            <option value="">
              Choose store
            </option>

            {
              stores.map(
                (store) => (

                  <option
                    key={
                      String(
                        store._id,
                      )
                    }
                    value={
                      String(
                        store._id,
                      )
                    }
                  >
                    {
                      String(
                        store.name ??
                        "",
                      )
                    }
                  </option>

                ),
              )
            }

          </select>


          <label>
            Product Name
          </label>

          <input
            type="text"
            placeholder="Product name"
            value={
              form.name
            }
            onChange={(e) =>
              setForm({
                ...form,
                name:
                  e.target.value,
              })
            }
            required
          />


          <label>
            Category
          </label>

          <select
            value={
              form.category
            }
            onChange={(e) =>
              setForm({
                ...form,
                category:
                  e.target.value,
              })
            }
            required
            disabled={
              categoriesLoading
            }
          >

            <option value="">

              {
                categoriesLoading
                  ? "Loading categories..."
                  : categories.length === 0
                    ? "No categories available"
                    : "Select a category"
              }

            </option>

            {
              categories.map(
                (category) => (

                  <option
                    key={
                      String(
                        category._id ||
                        category.slug ||
                        category.name,
                      )
                    }
                    value={
                      String(
                        category.name,
                      )
                    }
                  >
                    {
                      String(
                        category.name,
                      )
                    }
                  </option>

                ),
              )
            }

          </select>


          {
            !suggestCategoryOpen ? (

              <button
                type="button"
                className="suggest-category-toggle"
                onClick={() => {

                  setSuggestCategoryOpen(
                    true,
                  );

                  setSuggestCategoryStatus(
                    "idle",
                  );

                  setSuggestCategoryError(
                    "",
                  );
                }}
              >
                Can't find your category? Suggest one
              </button>

            ) : (

              <div className="suggest-category-box">

                <label>
                  Suggest a category
                </label>

                <p className="suggest-category-hint">
                  We'll review it and may add it later.
                </p>

                <div className="suggest-category-row">

                  <input
                    type="text"
                    placeholder="e.g. Musical Instruments"
                    value={
                      suggestCategoryName
                    }
                    onChange={(e) =>
                      setSuggestCategoryName(
                        e.target.value,
                      )
                    }
                    disabled={
                      suggestCategoryStatus ===
                      "submitting"
                    }
                  />

                  <button
                    type="button"
                    disabled={
                      suggestCategoryStatus ===
                      "submitting"
                    }
                    onClick={
                      handleSuggestCategory
                    }
                  >
                    {
                      suggestCategoryStatus ===
                      "submitting"
                        ? "Submitting..."
                        : "Submit suggestion"
                    }
                  </button>

                  <button
                    type="button"
                    className="suggest-category-cancel"
                    onClick={() => {

                      setSuggestCategoryOpen(
                        false,
                      );

                      setSuggestCategoryName(
                        "",
                      );

                      setSuggestCategoryStatus(
                        "idle",
                      );

                      setSuggestCategoryError(
                        "",
                      );
                    }}
                  >
                    Cancel
                  </button>

                </div>

                {
                  suggestCategoryStatus ===
                  "error" && (

                    <p className="suggest-category-error">
                      {
                        suggestCategoryError
                      }
                    </p>

                  )
                }

                {
                  suggestCategoryStatus ===
                  "success" && (

                    <p className="suggest-category-success">
                      Thanks — your suggestion was submitted for review.
                    </p>

                  )
                }

              </div>

            )
          }


          <div className="row">

            <div>

              <label>
                Price
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={
                  form.price === 0
                    ? ""
                    : form.price
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    price:
                      e.target.value === ""
                        ? 0
                        : Number(
                            e.target.value,
                          ),
                  })
                }
                required
              />

            </div>


            <div>

              <label>
                Stock
              </label>

              <input
                type="number"
                min="0"
                placeholder="Stock"
                value={
                  form.stock === 0
                    ? ""
                    : form.stock
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    stock:
                      e.target.value === ""
                        ? 0
                        : Number(
                            e.target.value,
                          ),
                  })
                }
                required
              />

            </div>


            <div>

              <label>
                Discount %
              </label>

              <input
                type="number"
                min="0"
                max="100"
                placeholder="Optional"
                value={
                  discount === 0
                    ? ""
                    : discount
                }
                onChange={(e) =>
                  setDiscount(
                    e.target.value === ""
                      ? 0
                      : Number(
                          e.target.value,
                        ),
                  )
                }
              />

            </div>

          </div>


          {
            discount > 0 &&
            form.price > 0 && (

              <p className="discount-preview">

                Sale price: $
                {
                  (
                    form.price *
                    (
                      1 -
                      discount / 100
                    )
                  ).toFixed(2)
                }

                {" "}
                (backend will calculate and store the final price)

              </p>

            )
          }


          <label>
            Description
          </label>

          <textarea
            placeholder="Describe your product..."
            value={
              form.description
            }
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
          />


          <div className="section-title">
            Shipping
          </div>


          <label>

            <input
              type="checkbox"
              checked={
                freeShipping
              }
              onChange={() =>
                setFreeShipping(
                  (value) =>
                    !value,
                )
              }
            />

            Free shipping

          </label>


          <label>

            <input
              type="checkbox"
              checked={
                fastDelivery
              }
              onChange={() =>
                setFastDelivery(
                  (value) =>
                    !value,
                )
              }
            />

            Fast delivery

          </label>


          <div className="section-title">
            Visibility
          </div>


          {
            [
              "marketplace",
              "feed",
              "story",
            ].map(
              (item) => (

                <label
                  key={item}
                >

                  <input
                    type="checkbox"
                    checked={
                      locations.includes(
                        item,
                      )
                    }
                    onChange={() =>
                      toggleLocation(
                        item,
                      )
                    }
                  />

                  {
                    item
                      .charAt(0)
                      .toUpperCase() +
                    item.slice(1)
                  }

                </label>

              ),
            )
          }


          {
            locations.includes(
              "feed",
            ) && (

              <div className="feed-box">

                <label>
                  Feed days
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    feedDays
                  }
                  onChange={(e) =>
                    setFeedDays(
                      Number(
                        e.target.value,
                      ),
                    )
                  }
                />

              </div>

            )
          }


          <label>
            Product Image
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={
              handleImage
            }
          />


          {
            preview && (

              <div
                style={{
                  marginTop:
                    "15px",
                }}
              >

                <img
                  src={
                    preview
                  }
                  alt="Product preview"
                  style={{
                    width:
                      "150px",
                    height:
                      "150px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "10px",
                    display:
                      "block",
                  }}
                />

              </div>

            )
          }


          {
            mode === "edit" &&
            !image &&
            Array.isArray(
              initialData?.images,
            ) &&
            initialData.images.length >
              0 && (

              <p>
                Current product image will be kept unless you choose a new image.
              </p>

            )
          }


          <button
            type="button"
            disabled={
              uploading ||
              categoriesLoading ||
              categories.length === 0
            }
            onClick={() =>
              handleSubmit()
            }
          >
            {
              uploading
                ? "Saving..."
                : mode === "edit"
                  ? "Update Product"
                  : "Publish Product"
            }
          </button>


          {
            mode === "edit" && (

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={() =>
                  navigate(
                    "/seller/products",
                  )
                }
              >
                Cancel
              </button>

            )
          }

        </div>

      </div>

    </div>
  );
}