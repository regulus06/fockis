import {

  FormEvent,

  useCallback,

  useEffect,

  useMemo,

  useState,

  type Dispatch,

  type SetStateAction,

} from "react";



import {

  CardElement,

  useElements,

  useStripe,

} from "@stripe/react-stripe-js";



import { useNavigate } from "react-router-dom";

import { FOCKIS_API_URL } from "../../../config/fockisConfig";



import { useCart } from "./useCart";



import type { CartLineItem } from "../types/cart.types";



import type {

  CheckoutCartItem,

  CheckoutSellerGroup,

  PaymentMethod,

  TipOption,

} from "../types/checkout.types";



import type { OrderShippingAddress } from "../types/order.types";



import type { ShippingEstimate } from "../types/shipping.types";



import {

  getShippingEstimates,

  type PlaceOrderRequest,

} from "../services/checkoutApi";



export interface CheckoutAddress extends OrderShippingAddress {

  fullName: string;

  email: string;

  line1: string;

  line2: string;

  city: string;

  state: string;

  postalCode: string;

  country: string;

  countryCode: string;

  phone: string;

}



export type BackendPaymentMethod =

  | "card"

  | "moncash"

  | "natcash"

  | "cod";



export interface CountryConfig {

  code: string;

  currency: string;

  currencySymbol: string;

  name: string;

  addressStateLabel: string;

  cityLabel: string;

  postalLabel: string;

  postalRequired: boolean;

  phoneRequired: boolean;

  requiresPostalCode: boolean;

  requiresPhone: boolean;

  paymentMethods: BackendPaymentMethod[];

}



export interface CheckoutTotals {

  subtotal: number;

  estimatedShipping: number;

  estimatedTax: number;

  tip: number;

  total: number;

  itemCount: number;

}



export interface StripePaymentResult {

  paymentIntentId: string;

  clientSecret: string;

  status?: string;

}



/**

 * Exact item DTO accepted by the Fockis Shop backend.

 *

 * IMPORTANT:

 * Do NOT add totalPrice.

 *

 * The backend calculates totals from:

 * quantity * unitPrice

 */

export interface BackendOrderItem {

  productId: string;

  sellerId?: string;

  storeId?: string;

  productName: string;

  quantity: number;

  unitPrice: number;

}



/**

 * Public checkout controller type.

 *

 * CheckoutForm imports this type directly:

 *

 * import type { CheckoutController } from "../../hooks/useCheckout";

 */

export interface CheckoutController {

  items: CartLineItem[];

  checkoutItems: CheckoutCartItem[];

  checkoutSellerGroups: CheckoutSellerGroup[];



  address: CheckoutAddress;

  setAddress: Dispatch<SetStateAction<CheckoutAddress>>;

  updateAddress: (

    field: keyof CheckoutAddress,

    value: string,

  ) => void;

  handleCountryChange: (

    countryCode: string,

  ) => void;



  countryCode: string;

  countryConfig: CountryConfig;

  countries: CountryConfig[];

  isHaiti: boolean;



  paymentMethod: PaymentMethod;

  setPaymentMethod: Dispatch<

    SetStateAction<PaymentMethod>

  >;

  selectPaymentMethod: (

    method: PaymentMethod,

  ) => void;

  supportedPaymentMethods: PaymentMethod[];



  cardComplete: boolean;

  setCardComplete: Dispatch<

    SetStateAction<boolean>

  >;



  estimates: ShippingEstimate[];

  shippingEstimates: ShippingEstimate[];

  shippingSelections: Record<string, string>;

  setShippingSelections: Dispatch<

    SetStateAction<Record<string, string>>

  >;



  selectShippingMethod: (

    storeId: string,

    optionId: string,

  ) => void;



  selectShipping: (

    storeId: string,

    optionId: string,

  ) => void;



  loadShippingEstimates: () => Promise<void>;



  storeNameById: Record<string, string>;



  subtotal: number;

  shipping: number;

  tax: number;

  tip: number;

  total: number;



  totals: CheckoutTotals;

  cartTotals: CheckoutTotals;



  tipOption: TipOption;

  setTipOption: Dispatch<

    SetStateAction<TipOption>

  >;



  customTip: string;

  setCustomTip: Dispatch<

    SetStateAction<string>

  >;



  tipAmount: number;

  orderTotal: number;



  formatCheckoutPrice: (

    value: number,

  ) => string;



  placing: boolean;

  isPlacing: boolean;



  shippingError: string;

  checkoutError: string;

  setCheckoutError: Dispatch<

    SetStateAction<string>

  >;



  addressComplete: boolean;

  shippingComplete: boolean;

  canPlaceOrder: boolean;



  validateAddress: () => string;



  stripe: ReturnType<typeof useStripe>;

  elements: ReturnType<typeof useElements>;



  submitOrder: () => Promise<void>;



  handleSubmit: (

    event: FormEvent<HTMLFormElement>,

  ) => Promise<void>;



  handlePlaceOrder: () => Promise<void>;



  placeOrder: () => Promise<void>;

}



const EMPTY_ADDRESS: CheckoutAddress = {

  fullName: "",

  email: "",

  line1: "",

  line2: "",

  city: "",

  state: "",

  postalCode: "",

  country: "United States",

  countryCode: "US",

  phone: "",

};



const COUNTRY_CONFIGS: CountryConfig[] = [

  {

    code: "US",

    currency: "USD",

    currencySymbol: "$",

    name: "United States",

    addressStateLabel: "State",

    cityLabel: "City",

    postalLabel: "ZIP code",

    postalRequired: true,

    phoneRequired: true,

    requiresPostalCode: true,

    requiresPhone: true,

    paymentMethods: ["card"],

  },

  {

    code: "CA",

    currency: "CAD",

    currencySymbol: "C$",

    name: "Canada",

    addressStateLabel: "Province",

    cityLabel: "City",

    postalLabel: "Postal code",

    postalRequired: true,

    phoneRequired: true,

    requiresPostalCode: true,

    requiresPhone: true,

    paymentMethods: ["card"],

  },

  {

    code: "GB",

    currency: "GBP",

    currencySymbol: "£",

    name: "United Kingdom",

    addressStateLabel: "County",

    cityLabel: "Town / City",

    postalLabel: "Postcode",

    postalRequired: true,

    phoneRequired: true,

    requiresPostalCode: true,

    requiresPhone: true,

    paymentMethods: ["card"],

  },

  {

    code: "FR",

    currency: "EUR",

    currencySymbol: "€",

    name: "France",

    addressStateLabel: "Region",

    cityLabel: "City",

    postalLabel: "Postal code",

    postalRequired: true,

    phoneRequired: true,

    requiresPostalCode: true,

    requiresPhone: true,

    paymentMethods: ["card"],

  },

  {

    code: "HT",

    currency: "HTG",

    currencySymbol: "G",

    name: "Haiti",

    addressStateLabel: "Department",

    cityLabel: "City",

    postalLabel: "Postal code",

    postalRequired: false,

    phoneRequired: true,

    requiresPostalCode: false,

    requiresPhone: true,

    paymentMethods: [

      "card",

      "moncash",

      "natcash",

      "cod",

    ],

  },

];



function numberValue(value: unknown): number {

  const parsed = Number(value);



  return Number.isFinite(parsed)

    ? parsed

    : 0;

}



function money(value: unknown): number {

  return Number(

    numberValue(value).toFixed(2),

  );

}



function normalizeCountryCode(

  value: unknown,

): string {

  return (

    String(value ?? "")

      .trim()

      .toUpperCase() || "US"

  );

}



function getCountryCode(

  address: CheckoutAddress,

): string {

  return normalizeCountryCode(

    address.countryCode,

  );

}



function normalizePaymentMethod(

  method: PaymentMethod,

): BackendPaymentMethod {

  if (method === "cash_on_delivery") {

    return "cod";

  }



  if (

    method === "card" ||

    method === "moncash" ||

    method === "natcash" ||

    method === "paypal"

  ) {

    return method === "paypal"

      ? "card"

      : method;

  }



  return "card";

}



function getCountryConfig(

  countryCode: string,

): CountryConfig {

  return (

    COUNTRY_CONFIGS.find(

      (country) =>

        country.code === countryCode,

    ) ?? COUNTRY_CONFIGS[0]

  );

}



function getAddressStreet(

  address: CheckoutAddress,

): string {

  return [

    address.line1,

    address.line2,

  ]

    .map((value) =>

      String(value || "").trim(),

    )

    .filter(Boolean)

    .join(", ");

}



function getHouseOrApartmentNumber(

  address: CheckoutAddress,

): string {

  const line = String(

    address.line1 || "",

  ).trim();



  const match = line.match(

    /^\s*([0-9]+[A-Za-z0-9-]*)/,

  );



  return (

    match?.[1] ||

    line ||

    "N/A"

  );

}



function buildBackendShippingAddress(

  address: CheckoutAddress,

): PlaceOrderRequest["shippingAddress"] {

  const fullName =

    address.fullName.trim();



  const line1 =

    address.line1.trim();



  const line2 =

    address.line2.trim();



  const city =

    address.city.trim();



  const state =

    address.state.trim();



  const postalCode =

    address.postalCode.trim();



  const countryCode =

    getCountryCode(address);



  const country =

    address.country.trim() ||

    "United States";



  const phone =

    address.phone.trim();



  const street =

    getAddressStreet(address);



  const houseOrApartmentNumber =

    getHouseOrApartmentNumber(

      address,

    );



  return {

    fullName,

    line1,

    line2: line2 || undefined,

    city,

    state: state || undefined,

    postalCode,

    country,

    countryCode,

    phone: phone || undefined,



    ...({

      houseOrApartmentNumber,

      neighborhood: "",

      street,

      apartment: line2,

      zipCode: postalCode,

    } as Record<string, string>),

  };

}



function toCheckoutCartItem(

  item: CartLineItem,

): CheckoutCartItem {

  return {

    id: item.id,



    productId:

      item.productId,



    productName:

      item.productName ||

      item.name ||

      item.title ||

      "Product",



    productEmoji:

      item.productEmoji,



    productImageUrl:

      item.productImageUrl,



    quantity: Math.max(

      1,

      Math.floor(

        numberValue(

          item.quantity,

        ),

      ),

    ),



    unitPrice:

      money(item.unitPrice),



    storeId:

      item.storeId,



    storeName:

      item.storeName ||

      "Fockis Shop",



    productSlug:

      item.productSlug,



    storeSlug:

      item.storeSlug,



    maxQuantity:

      item.maxQuantity,



    addedAt:

      item.addedAt,



    variant:

      item.variant ?? null,

  };

}



function buildOrderItems(

  items: CartLineItem[],

): BackendOrderItem[] {

  return items.map((item) => {

    const quantity = Math.max(

      1,

      Math.floor(

        numberValue(

          item.quantity,

        ),

      ),

    );



    const unitPrice =

      money(item.unitPrice);



    const result: BackendOrderItem = {

      productId:

        String(item.productId),



      productName:

        String(

          item.productName ||

          item.name ||

          item.title ||

          "Product",

        ),



      quantity,



      unitPrice,

    };



    if (

      item.sellerId !== undefined &&

      item.sellerId !== null &&

      String(

        item.sellerId,

      ).trim()

    ) {

      result.sellerId =

        String(

          item.sellerId,

        );

    }



    if (

      item.storeId !== undefined &&

      item.storeId !== null &&

      String(

        item.storeId,

      ).trim()

    ) {

      result.storeId =

        String(

          item.storeId,

        );

    }



    return result;

  });

}



function sanitizeOrderItems(

  items: BackendOrderItem[],

): BackendOrderItem[] {

  return items.map((item) => ({

    productId:

      String(item.productId),



    ...(item.sellerId

      ? {

          sellerId:

            String(item.sellerId),

        }

      : {}),



    ...(item.storeId

      ? {

          storeId:

            String(item.storeId),

        }

      : {}),



    productName:

      String(

        item.productName ||

        "Product",

      ),



    quantity: Math.max(

      1,

      Math.floor(

        numberValue(

          item.quantity,

        ),

      ),

    ),



    unitPrice:

      money(item.unitPrice),

  }));

}



function getDefaultShippingOption(

  estimate: ShippingEstimate,

): string {

  if (

    estimate.selectedOptionId &&

    estimate.options.some(

      (option) =>

        option.id ===

        estimate.selectedOptionId,

    )

  ) {

    return estimate.selectedOptionId;

  }



  return (

    estimate.options[0]?.id ||

    ""

  );

}



function buildShippingSelections(

  estimates: ShippingEstimate[],

  previous: Record<string, string>,

): Record<string, string> {

  const next: Record<string, string> = {};



  for (const estimate of estimates) {

    const existing =

      previous[

        estimate.storeId

      ];



    const existingIsValid =

      Boolean(

        existing &&

        estimate.options.some(

          (option) =>

            option.id === existing,

        ),

      );



    if (existingIsValid) {

      next[

        estimate.storeId

      ] = existing as string;



      continue;

    }



    const fallback =

      getDefaultShippingOption(

        estimate,

      );



    if (fallback) {

      next[

        estimate.storeId

      ] = fallback;

    }

  }



  return next;

}



function validateShippingSelections(

  groups: CheckoutSellerGroup[],

  estimates: ShippingEstimate[],

  selections: Record<string, string>,

): string {

  if (groups.length === 0) {

    return "Your cart is empty.";

  }



  if (estimates.length === 0) {

    return "";

  }



  for (const group of groups) {

    const estimate =

      estimates.find(

        (candidate) =>

          candidate.storeId ===

          group.storeId,

      );



    if (!estimate) {

      return `Shipping is unavailable for ${group.storeName}.`;

    }



    if (

      !estimate.options ||

      estimate.options.length === 0

    ) {

      return `No delivery methods are available for ${group.storeName}.`;

    }



    const selectedId =

      selections[group.storeId] ??

      estimate.selectedOptionId ??

      estimate.options[0]?.id ??

      "";



    if (!selectedId) {

      return `Please select a delivery method for ${group.storeName}.`;

    }



    const valid =

      estimate.options.some(

        (option) =>

          option.id === selectedId,

      );



    if (!valid) {

      return `Please select a valid delivery method for ${group.storeName}.`;

    }

  }



  return "";

}



function getApiBaseUrl(): string {
  return FOCKIS_API_URL.replace(/\/+$/, "");
}



function getAuthToken(): string {

  return (

    localStorage.getItem(

      "access_token",

    ) ||

    localStorage.getItem(

      "accessToken",

    ) ||

    localStorage.getItem(

      "token",

    ) ||

    localStorage.getItem(

      "jwt",

    ) ||

    localStorage.getItem(

      "authToken",

    ) ||

    localStorage.getItem(

      "fockis_token",

    ) ||

    localStorage.getItem(

      "fockis_auth_token",

    ) ||

    ""

  );

}



function extractResponseObject(

  value: unknown,

): Record<string, unknown> {

  if (

    !value ||

    typeof value !== "object"

  ) {

    return {};

  }



  const root =

    value as Record<

      string,

      unknown

    >;



  if (

    root.data &&

    typeof root.data === "object"

  ) {

    return root.data as Record<

      string,

      unknown

    >;

  }



  return root;

}



async function parseJsonResponse(

  response: Response,

): Promise<unknown> {

  const text =

    await response.text();



  if (!text) {

    return null;

  }



  try {

    return JSON.parse(text);

  } catch {

    return text;

  }

}



async function submitSanitizedOrder(

  request: PlaceOrderRequest,

): Promise<unknown> {

  const apiBase =

    getApiBaseUrl();



  const authToken =

    getAuthToken();



  /*

   * Rebuild the item array from scratch.

   *

   * This guarantees that totalPrice or any other

   * frontend-only property cannot reach the backend.

   */

  const rawRequest =

    request as unknown as Record<

      string,

      unknown

    >;



  const rawItems =

    Array.isArray(

      rawRequest.items,

    )

      ? rawRequest.items

      : [];



  const sanitizedItems =

    rawItems.map((item) => {

      const source =

        (item || {}) as Record<

          string,

          unknown

        >;



      return {

        productId:

          String(

            source.productId ??

              "",

          ),



        ...(source.sellerId !==

          undefined &&

        source.sellerId !==

          null &&

        String(

          source.sellerId,

        ).trim()

          ? {

              sellerId:

                String(

                  source.sellerId,

                ),

            }

          : {}),



        ...(source.storeId !==

          undefined &&

        source.storeId !==

          null &&

        String(

          source.storeId,

        ).trim()

          ? {

              storeId:

                String(

                  source.storeId,

                ),

            }

          : {}),



        productName:

          String(

            source.productName ??

              "Product",

          ),



        quantity:

          Math.max(

            1,

            Math.floor(

              numberValue(

                source.quantity,

              ),

            ),

          ),



        unitPrice:

          money(

            source.unitPrice,

          ),

      };

    });



  const payload: Record<

    string,

    unknown

  > = {

    ...rawRequest,

    items: sanitizedItems,

  };



  delete payload.totalPrice;



  console.log(

    "[CHECKOUT API] FINAL SANITIZED ORDER BODY:",

    JSON.stringify(payload),

  );



  const response =

    await fetch(

      `${apiBase}/fockis-shop/orders`,

      {

        method: "POST",



        headers: {

          Accept:

            "application/json",



          "Content-Type":

            "application/json",



          ...(authToken

            ? {

                Authorization:

                  `Bearer ${authToken}`,

              }

            : {}),

        },



        credentials: "include",



        body:

          JSON.stringify(

            payload,

          ),

      },

    );



  const data =

    await parseJsonResponse(

      response,

    );



  console.log(

    "[CHECKOUT API] Direct order response:",

    {

      status:

        response.status,

      ok:

        response.ok,

      data,

    },

  );



  if (!response.ok) {

    const errorObject =

      extractResponseObject(

        data,

      );



    const backendMessage =

      errorObject.message;



    const message =

      Array.isArray(

        backendMessage,

      )

        ? backendMessage.join(

            ", ",

          )

        : String(

            backendMessage ||

              `Order creation failed with status ${response.status}.`,

          );



    throw new Error(

      message,

    );

  }



  return data;

}



export function useCheckout(): CheckoutController {

  const navigate =

    useNavigate();



  const stripe =

    useStripe();



  const elements =

    useElements();



  const cart =

    useCart();



  const {

    items,

    totals:

      cartTotalsFromHook,

    clear,

  } = cart;



  const cartTotals =

    useMemo<CheckoutTotals>(

      () => {

        const source =

          cartTotalsFromHook as

            | Partial<CheckoutTotals>

            | undefined;



        const subtotal =

          money(

            source?.subtotal,

          );



        const estimatedShipping =

          money(

            source?.estimatedShipping,

          );



        const estimatedTax =

          money(

            source?.estimatedTax,

          );



        const calculatedItemCount =

          items.reduce(

            (

              sum,

              item,

            ) =>

              sum +

              Math.max(

                1,

                Math.floor(

                  numberValue(

                    item.quantity,

                  ),

                ),

              ),

            0,

          );



        const itemCount =

          numberValue(

            source?.itemCount,

          ) ||

          calculatedItemCount;



        return {

          subtotal,

          estimatedShipping,

          estimatedTax,



          /*

           * The cart does not contain a checkout tip.

           * Tips are selected later during checkout.

           */

          tip: 0,



          total: money(

            source?.total ??

              subtotal +

                estimatedShipping +

                estimatedTax,

          ),



          itemCount,

        };

      },

      [

        cartTotalsFromHook,

        items,

      ],

    );



  const [

    address,

    setAddress,

  ] =

    useState<CheckoutAddress>(

      EMPTY_ADDRESS,

    );



  const [

    paymentMethod,

    setPaymentMethod,

  ] =

    useState<PaymentMethod>(

      "card",

    );



  const [

    shippingEstimates,

    setShippingEstimates,

  ] =

    useState<ShippingEstimate[]>(

      [],

    );



  const [

    shippingSelections,

    setShippingSelections,

  ] =

    useState<

      Record<string, string>

    >({});



  const [

    placing,

    setPlacing,

  ] =

    useState(false);



  const [

    shippingError,

    setShippingError,

  ] =

    useState("");



  const [

    checkoutError,

    setCheckoutError,

  ] =

    useState("");



  const [

    cardComplete,

    setCardComplete,

  ] =

    useState(false);



  const [

    tipOption,

    setTipOption,

  ] =

    useState<TipOption>(

      "none",

    );



  const [

    customTip,

    setCustomTip,

  ] =

    useState("");



  const checkoutItems =

    useMemo(

      () =>

        items.map(

          toCheckoutCartItem,

        ),

      [items],

    );



  const checkoutSellerGroups =

    useMemo<CheckoutSellerGroup[]>(

      () => {

        const groups =

          new Map<

            string,

            CheckoutSellerGroup

          >();



        for (

          const item of checkoutItems

        ) {

          const storeId =

            String(

              item.storeId ||

                "",

            ).trim() ||

            "default";



          const storeName =

            item.storeName ||

            "Fockis Shop";



          const quantity =

            Math.max(

              1,

              Math.floor(

                numberValue(

                  item.quantity,

                ),

              ),

            );



          const unitPrice =

            money(

              item.unitPrice,

            );



          const existing =

            groups.get(

              storeId,

            );



          if (existing) {

            existing.items.push(

              item,

            );



            existing.subtotal =

              money(

                existing.subtotal +

                  unitPrice *

                    quantity,

              );

          } else {

            groups.set(

              storeId,

              {

                storeId,

                storeName,

                items: [item],

                subtotal:

                  money(

                    unitPrice *

                      quantity,

                  ),

              },

            );

          }

        }



        return Array.from(

          groups.values(),

        );

      },

      [checkoutItems],

    );



  const countryCode =

    useMemo(

      () =>

        getCountryCode(

          address,

        ),

      [address],

    );



  const countryConfig =

    useMemo(

      () =>

        getCountryConfig(

          countryCode,

        ),

      [countryCode],

    );



  const countries =

    COUNTRY_CONFIGS;



  const isHaiti =

    countryCode === "HT";



  const supportedPaymentMethods =

    useMemo<PaymentMethod[]>(

      () =>

        countryConfig.paymentMethods.map(

          (method) =>

            method === "cod"

              ? "cash_on_delivery"

              : (method as PaymentMethod),

        ),

      [countryConfig],

    );



  const storeNameById =

    useMemo(() => {

      const result: Record<

        string,

        string

      > = {};



      for (

        const group of

          checkoutSellerGroups

      ) {

        result[

          group.storeId

        ] =

          group.storeName;

      }



      return result;

    }, [

      checkoutSellerGroups,

    ]);



  const tipAmount =

    useMemo(() => {

      if (

        tipOption === "none"

      ) {

        return 0;

      }



      if (

        tipOption === "custom"

      ) {

        return money(

          customTip,

        );

      }



      const percentageMap: Record<

        string,

        number

      > = {

        "5": 0.05,

        "10": 0.1,

        "15": 0.15,

        "20": 0.2,

      };



      const percentage =

        percentageMap[

          String(tipOption)

        ] ?? 0;



      return money(

        cartTotals.subtotal *

          percentage,

      );

    }, [

      tipOption,

      customTip,

      cartTotals.subtotal,

    ]);



  const shippingCost =

    useMemo(() => {

      if (

        shippingEstimates.length ===

        0

      ) {

        return money(

          cartTotals.estimatedShipping,

        );

      }



      return money(

        shippingEstimates.reduce(

          (

            total,

            estimate,

          ) => {

            const selectedId =

              shippingSelections[

                estimate.storeId

              ] ??

              estimate.selectedOptionId ??

              estimate.options[0]?.id ??

              "";



            const option =

              estimate.options.find(

                (candidate) =>

                  candidate.id ===

                  selectedId,

              );



            return (

              total +

              money(

                option?.price,

              )

            );

          },

          0,

        ),

      );

    }, [

      shippingEstimates,

      shippingSelections,

      cartTotals.estimatedShipping,

    ]);



  const subtotal =

    money(

      cartTotals.subtotal,

    );



  const shipping =

    money(shippingCost);



  const tax =

    money(

      cartTotals.estimatedTax,

    );



  const orderTotal =

    money(

      subtotal +

        shipping +

        tax +

        tipAmount,

    );



  const checkoutTotals =

    useMemo<CheckoutTotals>(

      () => ({

        subtotal,



        estimatedShipping:

          shipping,



        estimatedTax:

          tax,



        /*

         * Tip is intentionally separate from tax.

         */

        tip:

          tipAmount,



        total:

          orderTotal,



        itemCount:

          checkoutItems.reduce(

            (

              sum,

              item,

            ) =>

              sum +

              Math.max(

                1,

                Math.floor(

                  numberValue(

                    item.quantity,

                  ),

                ),

              ),

            0,

          ),

      }),

      [

        subtotal,

        shipping,

        tax,

        tipAmount,

        orderTotal,

        checkoutItems,

      ],

    );



  const totals =

    checkoutTotals;



  const formatCheckoutPrice =

    useCallback(

      (value: number) => {

        try {

          return new Intl.NumberFormat(

            undefined,

            {

              style:

                "currency",



              currency:

                countryConfig.currency,



              minimumFractionDigits:

                2,



              maximumFractionDigits:

                2,

            },

          ).format(

            numberValue(value),

          );

        } catch {

          return `${countryConfig.currencySymbol}${money(

            value,

          ).toFixed(2)}`;

        }

      },

      [countryConfig],

    );



  const loadShippingEstimates =

    useCallback(

      async () => {

        if (

          items.length ===

          0

        ) {

          setShippingEstimates(

            [],

          );



          setShippingSelections(

            {},

          );



          setShippingError(

            "",

          );



          return;

        }



        try {

          setShippingError(

            "",

          );



          const result =

            await getShippingEstimates(

              items,

            );



          const normalized =

            Array.isArray(

              result,

            )

              ? result

              : [];



          setShippingEstimates(

            normalized,

          );



          setShippingSelections(

            (previous) =>

              buildShippingSelections(

                normalized,

                previous,

              ),

          );

        } catch (error) {

          console.error(

            "[CHECKOUT SHIPPING] Failed to load estimates:",

            error,

          );



          setShippingEstimates(

            [],

          );



          setShippingError(

            error instanceof Error

              ? error.message

              : "Unable to calculate shipping.",

          );

        }

      },

      [items],

    );



  useEffect(() => {

    void loadShippingEstimates();

  }, [

    loadShippingEstimates,

  ]);



  const updateAddress =

    useCallback(

      (

        field: keyof CheckoutAddress,

        value: string,

      ) => {

        setAddress(

          (previous) => ({

            ...previous,

            [field]:

              value,

          }),

        );

      },

      [],

    );



  const handleCountryChange =

    useCallback(

      (

        nextCountryCode: string,

      ) => {

        const normalized =

          normalizeCountryCode(

            nextCountryCode,

          );



        const config =

          getCountryConfig(

            normalized,

          );



        setAddress(

          (previous) => ({

            ...previous,

            countryCode:

              config.code,

            country:

              config.name,

            state: "",

            postalCode: "",

          }),

        );



        setPaymentMethod(

          config.paymentMethods.includes(

            "card",

          )

            ? "card"

            : "cash_on_delivery",

        );



        setCheckoutError(

          "",

        );

      },

      [],

    );



  const selectPaymentMethod =

    useCallback(

      (

        method: PaymentMethod,

      ) => {

        setPaymentMethod(

          method,

        );



        setCheckoutError(

          "",

        );

      },

      [],

    );



  const selectShippingMethod =

    useCallback(

      (

        storeId: string,

        optionId: string,

      ) => {

        setShippingSelections(

          (previous) => ({

            ...previous,

            [storeId]:

              optionId,

          }),

        );



        setShippingError(

          "",

        );



        setCheckoutError(

          "",

        );

      },

      [],

    );



  const selectShipping =

    selectShippingMethod;



  const validateAddress =

    useCallback(() => {

      if (

        !address.fullName.trim()

      ) {

        return "Please enter your full name.";

      }



      if (

        !address.email.trim()

      ) {

        return "Please enter your email address.";

      }



      if (

        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(

          address.email.trim(),

        )

      ) {

        return "Please enter a valid email address.";

      }



      if (

        !address.line1.trim()

      ) {

        return "Please enter your street address.";

      }



      if (

        !address.city.trim()

      ) {

        return "Please enter your city.";

      }



      if (

        countryConfig.addressStateLabel &&

        !address.state.trim()

      ) {

        return `Please enter your ${countryConfig.addressStateLabel.toLowerCase()}.`;

      }



      if (

        countryConfig.requiresPostalCode &&

        !address.postalCode.trim()

      ) {

        return `Please enter your ${countryConfig.postalLabel.toLowerCase()}.`;

      }



      if (

        countryConfig.requiresPhone &&

        !address.phone.trim()

      ) {

        return "Please enter your phone number.";

      }



      return "";

    }, [

      address,

      countryConfig,

    ]);



  const addressComplete =

    useMemo(() => {

      return (

        Boolean(

          address.fullName.trim(),

        ) &&

        Boolean(

          address.email.trim(),

        ) &&

        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(

          address.email.trim(),

        ) &&

        Boolean(

          address.line1.trim(),

        ) &&

        Boolean(

          address.city.trim(),

        ) &&

        Boolean(

          address.state.trim(),

        ) &&

        (!countryConfig.requiresPostalCode ||

          Boolean(

            address.postalCode.trim(),

          )) &&

        (!countryConfig.requiresPhone ||

          Boolean(

            address.phone.trim(),

          ))

      );

    }, [

      address,

      countryConfig,

    ]);



  const shippingComplete =

    useMemo(() => {

      if (

        checkoutSellerGroups.length ===

        0

      ) {

        return false;

      }



      if (shippingError) {

        return false;

      }



      if (

        shippingEstimates.length ===

        0

      ) {

        return (

          money(

            cartTotals.estimatedShipping,

          ) === 0

        );

      }



      return (

        validateShippingSelections(

          checkoutSellerGroups,

          shippingEstimates,

          shippingSelections,

        ) === ""

      );

    }, [

      checkoutSellerGroups,

      shippingError,

      shippingEstimates,

      shippingSelections,

      cartTotals.estimatedShipping,

    ]);



  const canPlaceOrder =

    !placing &&

    checkoutItems.length > 0 &&

    addressComplete &&

    shippingComplete &&

    supportedPaymentMethods.includes(

      paymentMethod,

    ) &&

    (

      paymentMethod !== "card" ||

      cardComplete

    );



  const createStripePayment =

    useCallback(

      async (): Promise<StripePaymentResult> => {

        console.log(

          "[CHECKOUT PAYMENT] Starting Stripe payment...",

        );



        if (!stripe) {

          throw new Error(

            "Stripe is not ready. Please wait a moment and try again.",

          );

        }



        if (!elements) {

          throw new Error(

            "Stripe payment elements are not ready. Please refresh and try again.",

          );

        }



        const cardElement =

          elements.getElement(

            CardElement,

          );



        if (!cardElement) {

          throw new Error(

            "Card payment form is not available.",

          );

        }



        if (!cardComplete) {

          throw new Error(

            "Please complete your card information.",

          );

        }



        const paymentMethodResult =

          await stripe.createPaymentMethod(

            {

              type: "card",



              card:

                cardElement,



              billing_details: {

                name:

                  address.fullName.trim() ||

                  undefined,



                email:

                  address.email.trim() ||

                  undefined,



                phone:

                  address.phone.trim() ||

                  undefined,



                address: {

                  line1:

                    address.line1.trim() ||

                    undefined,



                  line2:

                    address.line2.trim() ||

                    undefined,



                  city:

                    address.city.trim() ||

                    undefined,



                  state:

                    address.state.trim() ||

                    undefined,



                  postal_code:

                    address.postalCode.trim() ||

                    undefined,



                  country:

                    countryCode ||

                    undefined,

                },

              },

            },

          );



        if (

          paymentMethodResult.error ||

          !paymentMethodResult.paymentMethod

        ) {

          throw new Error(

            paymentMethodResult.error

              ?.message ||

              "Unable to create the Stripe payment method.",

          );

        }



        const stripePaymentMethod =

          paymentMethodResult.paymentMethod;



        console.log(

          "[CHECKOUT PAYMENT] Stripe PaymentMethod created:",

          stripePaymentMethod.id,

        );



        const checkoutId =

          `checkout_${Date.now()}_${Math.random()

            .toString(36)

            .slice(2, 10)}`;



        const referenceId =

          checkoutId;



        const idempotencyKey =

          `shop_${referenceId}`;



        const apiBase =

          getApiBaseUrl();



        const payload = {

          purpose:

            "marketplace_order",



          referenceId,



          baseAmount:

            money(orderTotal),



          baseCurrency:

            countryConfig.currency,



          country:

            countryCode,



          idempotencyKey,



          metadata: {

            source:

              "fockis_shop_checkout",



            checkoutId,



            paymentMethodId:

              stripePaymentMethod.id,

          },

        };



        const authToken =

          getAuthToken();



        const createResponse =

          await fetch(

            `${apiBase}/payments/create`,

            {

              method: "POST",



              headers: {

                Accept:

                  "application/json",



                "Content-Type":

                  "application/json",



                ...(authToken

                  ? {

                      Authorization:

                        `Bearer ${authToken}`,

                    }

                  : {}),

              },



              credentials: "include",



              body:

                JSON.stringify(

                  payload,

                ),

            },

          );



        const createData =

          await parseJsonResponse(

            createResponse,

          );



        if (

          !createResponse.ok

        ) {

          const errorObject =

            extractResponseObject(

              createData,

            );



          const backendMessage =

            errorObject.message;



          const message =

            Array.isArray(

              backendMessage,

            )

              ? backendMessage.join(

                  ", ",

                )

              : String(

                  backendMessage ||

                    "Unable to create payment.",

                );



          throw new Error(

            message,

          );

        }



        const paymentObject =

          extractResponseObject(

            createData,

          );



        const clientSecret =

          String(

            paymentObject.clientSecret ||

              paymentObject.client_secret ||

              "",

          ).trim();



        const paymentIntentId =

          String(

            paymentObject.stripePaymentIntentId ||

              paymentObject.paymentIntentId ||

              paymentObject.id ||

              "",

          ).trim();



        if (!clientSecret) {

          throw new Error(

            "The payment service did not return a Stripe client secret.",

          );

        }



        const confirmation =

          await stripe.confirmCardPayment(

            clientSecret,

            {

              payment_method:

                stripePaymentMethod.id,

            },

          );



        if (

          confirmation.error

        ) {

          throw new Error(

            confirmation.error

              .message ||

              "Stripe could not confirm the payment.",

          );

        }



        const paymentIntent =

          confirmation.paymentIntent;



        if (!paymentIntent) {

          throw new Error(

            "Stripe did not return a payment intent.",

          );

        }



        console.log(

          "[CHECKOUT PAYMENT] Stripe PaymentIntent result:",

          {

            id:

              paymentIntent.id,

            status:

              paymentIntent.status,

          },

        );



        if (

          paymentIntent.status !==

          "succeeded"

        ) {

          if (

            paymentIntent.status ===

            "processing"

          ) {

            throw new Error(

              "Your payment is still processing. Please wait before trying again.",

            );

          }



          if (

            paymentIntent.status ===

              "requires_action" ||

            paymentIntent.status ===

              "requires_confirmation"

          ) {

            throw new Error(

              "Your bank requires additional payment confirmation.",

            );

          }



          if (

            paymentIntent.status ===

            "requires_payment_method"

          ) {

            throw new Error(

              "The payment method was declined. Please check your card details and try again.",

            );

          }



          throw new Error(

            `Payment was not completed. Stripe status: ${paymentIntent.status}.`,

          );

        }



        console.log(

          "[CHECKOUT PAYMENT] PAYMENT SUCCESSFUL:",

          paymentIntent.id,

        );



        const confirmAuthToken =

          getAuthToken();



        const confirmResponse =

          await fetch(

            `${apiBase}/payments/confirm`,

            {

              method: "POST",



              headers: {

                Accept:

                  "application/json",



                "Content-Type":

                  "application/json",



                ...(confirmAuthToken

                  ? {

                      Authorization:

                        `Bearer ${confirmAuthToken}`,

                    }

                  : {}),

              },



              credentials: "include",



              body:

                JSON.stringify({

                  paymentIntentId:

                    paymentIntent.id,

                }),

            },

          );



        const confirmData =

          await parseJsonResponse(

            confirmResponse,

          );



        if (

          !confirmResponse.ok

        ) {

          const errorObject =

            extractResponseObject(

              confirmData,

            );



          const backendMessage =

            errorObject.message;



          const message =

            Array.isArray(

              backendMessage,

            )

              ? backendMessage.join(

                  ", ",

                )

              : String(

                  backendMessage ||

                    "The payment was successful, but Fockis could not verify it.",

                );



          throw new Error(

            message,

          );

        }



        console.log(

          "[CHECKOUT PAYMENT] FOCKIS PAYMENT VERIFIED:",

          paymentIntent.id,

        );



        return {

          paymentIntentId:

            paymentIntent.id,



          clientSecret,



          status:

            paymentIntent.status,

        };

      },

      [

        stripe,

        elements,

        cardComplete,

        address,

        countryCode,

        countryConfig,

        orderTotal,

      ],

    );



  const resetCheckoutAfterSuccess =

    useCallback(() => {

      console.log(

        "[CHECKOUT] Resetting checkout state after successful order.",

      );



      setAddress(

        EMPTY_ADDRESS,

      );



      setPaymentMethod(

        "card",

      );



      setShippingEstimates(

        [],

      );



      setShippingSelections(

        {},

      );



      setShippingError(

        "",

      );



      setCheckoutError(

        "",

      );



      setCardComplete(

        false,

      );



      setTipOption(

        "none",

      );



      setCustomTip(

        "",

      );

    }, []);



  const submitOrder =

    useCallback(

      async () => {

        console.log(

          "[CHECKOUT] submitOrder() started",

        );



        setCheckoutError(

          "",

        );



        if (

          items.length ===

          0

        ) {

          setCheckoutError(

            "Your cart is empty.",

          );



          return;

        }



        const addressError =

          validateAddress();



        if (addressError) {

          setCheckoutError(

            addressError,

          );



          return;

        }



        let currentEstimates =

          shippingEstimates;



        let currentSelections =

          shippingSelections;



        const shippingValidation =

          validateShippingSelections(

            checkoutSellerGroups,

            currentEstimates,

            currentSelections,

          );



        if (

          shippingValidation &&

          currentEstimates.length >

            0

        ) {

          try {

            await loadShippingEstimates();



            const refreshed =

              await getShippingEstimates(

                items,

              );



            currentEstimates =

              Array.isArray(

                refreshed,

              )

                ? refreshed

                : [];



            currentSelections =

              buildShippingSelections(

                currentEstimates,

                currentSelections,

              );



            setShippingEstimates(

              currentEstimates,

            );



            setShippingSelections(

              currentSelections,

            );

          } catch (error) {

            const message =

              error instanceof Error

                ? error.message

                : "Unable to calculate shipping.";



            setShippingError(

              message,

            );



            setCheckoutError(

              message,

            );



            return;

          }

        }



        const finalShippingValidation =

          validateShippingSelections(

            checkoutSellerGroups,

            currentEstimates,

            currentSelections,

          );



        if (

          finalShippingValidation

        ) {

          const canUseZeroShippingFallback =

            currentEstimates.length ===

              0 &&

            money(

              cartTotals.estimatedShipping,

            ) === 0 &&

            !shippingError;



          if (

            !canUseZeroShippingFallback

          ) {

            setCheckoutError(

              finalShippingValidation,

            );



            return;

          }

        }



        if (

          paymentMethod ===

            "card" &&

          !cardComplete

        ) {

          setCheckoutError(

            "Please complete your card information.",

          );



          return;

        }



        if (

          !supportedPaymentMethods.includes(

            paymentMethod,

          )

        ) {

          setCheckoutError(

            "The selected payment method is not available for this country.",

          );



          return;

        }



        setPlacing(true);



        try {

          const backendPaymentMethod =

            normalizePaymentMethod(

              paymentMethod,

            );



          let paymentIntentId:

            | string

            | undefined;



          if (

            backendPaymentMethod ===

            "card"

          ) {

            const paymentResult =

              await createStripePayment();



            paymentIntentId =

              paymentResult.paymentIntentId;



            if (

              !paymentIntentId

            ) {

              throw new Error(

                "Payment succeeded but no payment intent ID was returned.",

              );

            }



            if (

              paymentResult.status &&

              paymentResult.status !==

                "succeeded"

            ) {

              throw new Error(

                "Payment was not successfully confirmed.",

              );

            }

          }



          const rawOrderItems =

            buildOrderItems(

              items,

            );



          const orderItems =

            sanitizeOrderItems(

              rawOrderItems,

            );



          const selectedShippingMethods =

            checkoutSellerGroups

              .map((group) => {

                const estimate =

                  currentEstimates.find(

                    (candidate) =>

                      candidate.storeId ===

                      group.storeId,

                  );



                const optionId =

                  currentSelections[

                    group.storeId

                  ] ??

                  estimate?.selectedOptionId ??

                  estimate?.options[0]?.id ??

                  "";



                const option =

                  estimate?.options.find(

                    (candidate) =>

                      candidate.id ===

                      optionId,

                  );



                return {

                  storeId:

                    group.storeId,



                  storeName:

                    group.storeName,



                  optionId,



                  optionName:

                    option?.label ||

                    optionId,



                  price:

                    money(

                      option?.price,

                    ),

                };

              })

              .filter(

                (selection) =>

                  Boolean(

                    selection.optionId,

                  ),

              );



          /*

           * IMPORTANT:

           *

           * Tip is calculated separately from tax.

           *

           * The frontend totals are:

           * subtotal + shipping + tax + tip

           *

           * If the current backend PlaceOrderRequest does not yet

           * expose a dedicated tip field, we keep the request

           * compatible with the existing backend by sending the

           * existing tax field as the actual tax amount.

           */

          const request = {

            items:

              orderItems,



            subtotal:

              checkoutTotals.subtotal,



            shippingCost:

              checkoutTotals.estimatedShipping,



            tax:

              checkoutTotals.estimatedTax,



            totalAmount:

              checkoutTotals.total,



            shippingAddress:

              buildBackendShippingAddress(

                address,

              ),



            paymentMethod:

              backendPaymentMethod,



            currency:

              countryConfig.currency,



            deliveryMethod:

              selectedShippingMethods

                .map(

                  (

                    selection,

                  ) =>

                    selection.optionId,

                )

                .filter(Boolean)

                .join(","),



            paymentStatus:

              backendPaymentMethod ===

              "card"

                ? "paid"

                : "pending",



            ...(paymentIntentId

              ? {

                  paymentIntentId,

                }

              : {}),



            /*

             * Include the tip for newer backends that support it.

             * The request is cast below so older PlaceOrderRequest

             * definitions do not break the frontend build.

             */

            ...(tipAmount > 0

              ? {

                  tip:

                    tipAmount,

                }

              : {}),

          } as unknown as PlaceOrderRequest;



          const serializedRequest =

            JSON.stringify(

              request,

            );



          console.log(

            "[CHECKOUT] FINAL serialized order payload:",

            serializedRequest,

          );



          if (

            serializedRequest.includes(

              '"totalPrice"',

            )

          ) {

            throw new Error(

              "Checkout safety check failed: totalPrice is still present in the order payload.",

            );

          }



          console.log(

            "[CHECKOUT] Creating Shop order...",

          );



          const orderResponse =

            await submitSanitizedOrder(

              request,

            );



          console.log(

            "[CHECKOUT] Shop order created:",

            orderResponse,

          );



          const responseObject =

            extractResponseObject(

              orderResponse,

            );



          const orderId =

            String(

              responseObject.orderId ||

                responseObject.id ||

                responseObject._id ||

                "",

            ).trim();



          /*

           * IMPORTANT:

           *

           * Stripe payment succeeded.

           * Fockis payment verification succeeded.

           * Shop order creation succeeded.

           *

           * ONLY NOW do we clear the cart.

           */

          console.log(

            "[CHECKOUT] Clearing Zustand/server cart...",

          );



          await clear();



          console.log(

            "[CHECKOUT] CART CLEARED SUCCESSFULLY.",

          );



          resetCheckoutAfterSuccess();



          if (orderId) {

            navigate(

              `/shop/orders/${encodeURIComponent(

                orderId,

              )}`,

              {

                replace: true,

              },

            );

          } else {

            navigate(

              "/shop/orders",

              {

                replace: true,

              },

            );

          }

        } catch (error) {

          console.error(

            "[CHECKOUT] Checkout failed:",

            error,

          );



          setCheckoutError(

            error instanceof Error

              ? error.message

              : "Checkout failed. Please try again.",

          );

        } finally {

          setPlacing(false);

        }

      },

      [

        items,

        validateAddress,

        shippingEstimates,

        shippingSelections,

        checkoutSellerGroups,

        loadShippingEstimates,

        cartTotals.estimatedShipping,

        shippingError,

        paymentMethod,

        cardComplete,

        supportedPaymentMethods,

        createStripePayment,

        checkoutTotals,

        tipAmount,

        address,

        countryConfig.currency,

        clear,

        resetCheckoutAfterSuccess,

      ],

    );



  const handleSubmit =

    useCallback(

      async (

        event: FormEvent<HTMLFormElement>,

      ) => {

        event.preventDefault();



        if (placing) {

          return;

        }



        await submitOrder();

      },

      [

        placing,

        submitOrder,

      ],

    );



  const handlePlaceOrder =

    useCallback(

      async () => {

        await submitOrder();

      },

      [submitOrder],

    );



  const placeOrderHandler =

    useCallback(

      async () => {

        await submitOrder();

      },

      [submitOrder],

    );



  return {

    items,



    checkoutItems,



    checkoutSellerGroups,



    address,



    setAddress,



    updateAddress,



    handleCountryChange,



    countryCode,



    countryConfig,



    countries,



    isHaiti,



    paymentMethod,



    setPaymentMethod,



    selectPaymentMethod,



    supportedPaymentMethods,



    cardComplete,



    setCardComplete,



    estimates:

      shippingEstimates,



    shippingEstimates,



    shippingSelections,



    setShippingSelections,



    selectShippingMethod,



    selectShipping,



    loadShippingEstimates,



    storeNameById,



    subtotal,



    shipping,



    tax,



    /*

     * IMPORTANT FIX:

     *

     * The CheckoutController requires a `tip` property.

     * Previously this was incorrectly returned as `tax:

     * tipAmount`, which caused the TypeScript error.

     */

    tip:

      tipAmount,



    total:

      orderTotal,



    totals,



    cartTotals,



    tipOption,



    setTipOption,



    customTip,



    setCustomTip,



    tipAmount,



    orderTotal,



    formatCheckoutPrice,



    placing,



    isPlacing:

      placing,



    shippingError,



    checkoutError,



    setCheckoutError,



    addressComplete,



    shippingComplete,



    canPlaceOrder,



    validateAddress,



    stripe,



    elements,



    submitOrder,



    handleSubmit,



    handlePlaceOrder,



    placeOrder:

      placeOrderHandler,

  };

}



export default useCheckout;