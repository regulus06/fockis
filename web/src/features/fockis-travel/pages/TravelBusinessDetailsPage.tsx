import React, {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from "react";



import {

  ArrowLeft,

  CheckCircle2,

  Globe2,

  Mail,

  MapPin,

  Phone,

  RefreshCw,

  ShieldCheck,

  Star,

} from "lucide-react";



import {

  Link,

  useNavigate,

  useParams,

} from "react-router-dom";



import {

  partnersApi,

  type Partner,

} from "../services/partnersApi";



import { travelApi } from "../services/travelApi";
import { FOCKIS_API_URL } from "../../../config/fockisConfig";



import "../styles/TravelBusinessPage.scss";



type PartnerAddress = {

  address?: string;

  addressLine2?: string;

  city?: string;

  state?: string;

  department?: string;

  postalCode?: string;

  country?: string;

  latitude?: number;

  longitude?: number;

};



type PartnerService = {

  name?: string;

  description?: string;

  price?: number;

  currency?: string;

  active?: boolean;

};



type TravelListing = {

  _id?: string;

  id?: string;

  title?: string;

  name?: string;

  description?: string;

  type?: string;

  category?: string;

  status?: string;

  active?: boolean;

  published?: boolean;



  partnerId?: string;

  partner_id?: string;



  businessId?: string;

  business_id?: string;



  userId?: string;

  user_id?: string;



  partnerUserId?: string;

  partner_user_id?: string;



  partner?: {

    _id?: string;

    id?: string;

    userId?: string;

  };



  price?: number;

  currency?: string;



  images?: string[];

  image?: string;

  coverImage?: string;



  location?: unknown;

  metadata?: unknown;

};



type NormalizedPartner = Partner & {

  _id?: string;

  id?: string;

  userId?: string;



  businessName?: string;

  description?: string;



  country?: string;

  city?: string;

  state?: string;

  department?: string;

  address?: string;

  postalCode?: string;



  addressInfo?: PartnerAddress;



  phone?: string;

  email?: string;

  website?: string;



  logo?: string;

  coverImage?: string;

  images?: string[];



  acceptingBookings?: boolean;

  active?: boolean;

  status?: string;



  services?: PartnerService[];



  amenities?: string[];

  features?: string[];



  featured?: boolean;



  category?: string;

  categories?: string[];

};



function getString(

  value: unknown,

): string {

  if (typeof value === "string") {

    return value.trim();

  }



  if (

    typeof value === "number" ||

    typeof value === "boolean"

  ) {

    return String(value);

  }



  return "";

}



function getNumber(

  value: unknown,

): number | null {

  if (

    typeof value === "number" &&

    Number.isFinite(value)

  ) {

    return value;

  }



  if (typeof value === "string") {

    const parsed = Number(value);



    if (Number.isFinite(parsed)) {

      return parsed;

    }

  }



  return null;

}



function getObject(

  value: unknown,

): Record<string, unknown> {

  if (

    value &&

    typeof value === "object" &&

    !Array.isArray(value)

  ) {

    return value as Record<string, unknown>;

  }



  return {};

}



function getApiPayload(

  response: unknown,

): unknown {

  const object = getObject(response);



  if (

    Object.prototype.hasOwnProperty.call(

      object,

      "data",

    )

  ) {

    return object.data;

  }



  return response;

}



/**

 * Backend origin used for uploaded Travel media.

 *

 * Uploaded files normally come back as:

 *

 * /uploads/example.jpg

 *

 * The browser frontend runs on localhost:5173,

 * while the uploaded file is served by the NestJS

 * backend on port 3000.

 */

const API_ORIGIN = String(

  import.meta.env.VITE_API_URL ||

    import.meta.env.VITE_API_BASE_URL ||

    "http://192.168.1.112:3000",

)

  .replace(/\/+$/, "")

  .replace(/\/+travel$/, "");



/**

 * Converts backend-relative media paths into

 * browser-loadable URLs.

 */

function resolveMediaUrl(

  value: unknown,

): string {

  const raw = getString(value);



  if (!raw) {

    return "";

  }



  if (

    /^https?:\/\//i.test(raw) ||

    /^\/\//.test(raw) ||

    raw.startsWith("blob:") ||

    raw.startsWith("data:")

  ) {

    return raw;

  }



  if (raw.startsWith("/")) {

    return `${API_ORIGIN}${raw}`;

  }



  return `${API_ORIGIN}/${raw}`;

}



function normalizePartner(

  value: unknown,

): NormalizedPartner | null {

  if (

    !value ||

    typeof value !== "object"

  ) {

    return null;

  }



  return value as NormalizedPartner;

}



function getPartnerAddress(

  partner: NormalizedPartner,

): PartnerAddress {

  const addressInfo = getObject(

    partner.addressInfo,

  ) as PartnerAddress;



  return {

    ...addressInfo,



    address:

      addressInfo.address ||

      getString(partner.address),



    city:

      addressInfo.city ||

      getString(partner.city),



    state:

      addressInfo.state ||

      getString(partner.state),



    department:

      addressInfo.department ||

      getString(partner.department),



    postalCode:

      addressInfo.postalCode ||

      getString(partner.postalCode),



    country:

      addressInfo.country ||

      getString(partner.country),

  };

}



function getBusinessLocation(

  partner: NormalizedPartner,

): string {

  const address =

    getPartnerAddress(partner);



  return [

    address.city,

    address.department,

    address.state,

    address.country,

  ]

    .filter(Boolean)

    .join(", ");

}



function getBusinessAddressLine(

  partner: NormalizedPartner,

): string {

  const address =

    getPartnerAddress(partner);



  return [

    address.address,

    address.addressLine2,

    address.city,

    address.department ||

      address.state,

    address.postalCode,

    address.country,

  ]

    .filter(Boolean)

    .join(", ");

}



function getCategory(

  partner: NormalizedPartner,

): string {

  if (partner.category) {

    return String(partner.category);

  }



  if (

    Array.isArray(partner.categories) &&

    partner.categories.length > 0

  ) {

    return String(

      partner.categories[0],

    );

  }



  return "Travel Business";

}



function getBusinessInitials(

  businessName: string,

): string {

  const words = businessName

    .trim()

    .split(/\s+/)

    .filter(Boolean);



  if (words.length === 0) {

    return "FB";

  }



  if (words.length === 1) {

    return words[0]

      .slice(0, 2)

      .toUpperCase();

  }



  return (

    words[0][0] +

    words[1][0]

  ).toUpperCase();

}



function getPartnerLogo(

  partner: NormalizedPartner,

): string {

  const candidates: unknown[] = [

    partner.logo,

  ];



  if (Array.isArray(partner.images)) {

    candidates.push(

      ...partner.images,

    );

  }



  for (const candidate of candidates) {

    const resolved =

      resolveMediaUrl(candidate);



    if (resolved) {

      return resolved;

    }

  }



  return "";

}



/**

 * IMPORTANT:

 *

 * The partner's coverImage is the primary source.

 *

 * We also support alternate field names because

 * different backend versions may return:

 *

 * coverImage

 * coverPhoto

 * cover

 * image

 * imageUrl

 * photo

 * photoUrl

 * thumbnail

 * thumbnailUrl

 */

function getPartnerCover(

  partner: NormalizedPartner,

): string {

  const rawPartner =

    partner as unknown as Record<

      string,

      unknown

    >;



  const candidates: unknown[] = [

    rawPartner.coverImage,

    rawPartner.coverPhoto,

    rawPartner.cover,

    rawPartner.image,

    rawPartner.imageUrl,

    rawPartner.photo,

    rawPartner.photoUrl,

    rawPartner.thumbnail,

    rawPartner.thumbnailUrl,

  ];



  for (const candidate of candidates) {

    const resolved =

      resolveMediaUrl(candidate);



    if (resolved) {

      return resolved;

    }

  }



  /*

   * Only use the first partner image as a

   * fallback if there is no dedicated cover.

   */

  if (Array.isArray(partner.images)) {

    for (const image of partner.images) {

      const resolved =

        resolveMediaUrl(image);



      if (resolved) {

        return resolved;

      }

    }

  }



  return "";

}



function isPublishedListing(

  listing: TravelListing,

): boolean {

  if (listing.active === false) {

    return false;

  }



  const status = getString(

    listing.status,

  ).toLowerCase();



  if (

    status &&

    ![

      "published",

      "active",

      "approved",

      "live",

    ].includes(status)

  ) {

    return false;

  }



  if (listing.published === false) {

    return false;

  }



  return true;

}



function getListingId(

  listing: TravelListing,

): string {

  return (

    getString(listing._id) ||

    getString(listing.id)

  );

}



function getListingTitle(

  listing: TravelListing,

): string {

  return (

    getString(listing.title) ||

    getString(listing.name) ||

    "Travel listing"

  );

}



function getListingImage(

  listing: TravelListing,

): string {

  if (

    Array.isArray(listing.images) &&

    listing.images.length > 0

  ) {

    for (const image of listing.images) {

      const resolved =

        resolveMediaUrl(image);



      if (resolved) {

        return resolved;

      }

    }

  }



  return resolveMediaUrl(

    listing.image ||

      listing.coverImage,

  );

}



function getListingCategory(

  listing: TravelListing,

): string {

  return (

    getString(listing.category) ||

    getString(listing.type) ||

    "Travel"

  );

}



function formatPrice(

  price: number | null,

  currency?: string,

): string {

  if (price === null) {

    return "Price available when booking";

  }



  const normalizedCurrency =

    getString(currency).toUpperCase() ||

    "USD";



  try {

    return new Intl.NumberFormat(

      undefined,

      {

        style: "currency",

        currency: normalizedCurrency,

        maximumFractionDigits: 2,

      },

    ).format(price);

  } catch {

    return `${normalizedCurrency} ${price.toFixed(

      2,

    )}`;

  }

}



function getListingPartnerIdentifiers(

  listing: TravelListing,

): string[] {

  const metadata = getObject(

    listing.metadata,

  );



  const nestedPartner = getObject(

    listing.partner,

  );



  return [

    listing.partnerId,

    listing.partner_id,



    listing.businessId,

    listing.business_id,



    listing.userId,

    listing.user_id,



    listing.partnerUserId,

    listing.partner_user_id,



    metadata.partnerId,

    metadata.partner_id,



    metadata.businessId,

    metadata.business_id,



    metadata.userId,

    metadata.user_id,



    metadata.partnerUserId,

    metadata.partner_user_id,



    nestedPartner._id,

    nestedPartner.id,

    nestedPartner.userId,

  ]

    .map(getString)

    .filter(Boolean);

}



function unwrapListings(

  payload: unknown,

): TravelListing[] {

  if (Array.isArray(payload)) {

    return payload as TravelListing[];

  }



  const root = getObject(payload);



  const candidates = [

    root.items,

    root.results,

    root.listings,

    root.data,

  ];



  for (const candidate of candidates) {

    if (Array.isArray(candidate)) {

      return candidate as TravelListing[];

    }

  }



  const nestedData = getObject(

    root.data,

  );



  for (const key of [

    "items",

    "results",

    "listings",

  ]) {

    const candidate =

      nestedData[key];



    if (Array.isArray(candidate)) {

      return candidate as TravelListing[];

    }

  }



  return [];

}



export default function TravelBusinessDetailsPage() {

  const { id } =

    useParams<{ id: string }>();



  const navigate = useNavigate();



  const [partner, setPartner] =

    useState<NormalizedPartner | null>(

      null,

    );



  const [listings, setListings] =

    useState<TravelListing[]>([]);



  const [loading, setLoading] =

    useState(true);



  const [

    listingsLoading,

    setListingsLoading,

  ] = useState(true);



  const [error, setError] =

    useState("");



  const [

    listingsError,

    setListingsError,

  ] = useState("");



  const loadBusiness =

    useCallback(async () => {

      if (!id) {

        setError(

          "Business ID is missing.",

        );

        setLoading(false);

        return;

      }



      try {

        setLoading(true);

        setError("");



        const response =

          await partnersApi.getPublicBusiness(

            id,

          );



        console.log(

          "[Fockis Travel] Public business response:",

          response,

        );



        const payload =

          getApiPayload(response);



        console.log(

          "[Fockis Travel] Public business payload:",

          payload,

        );



        const normalized =

          normalizePartner(payload);



        if (!normalized) {

          throw new Error(

            "Business information could not be loaded.",

          );

        }



        console.log(

          "[Fockis Travel] Business coverImage:",

          normalized.coverImage,

        );



        console.log(

          "[Fockis Travel] Resolved cover:",

          getPartnerCover(normalized),

        );



        setPartner(normalized);

      } catch (requestError) {

        console.error(

          "Failed to load public Travel business:",

          requestError,

        );



        setPartner(null);



        setError(

          "We could not load this business right now.",

        );

      } finally {

        setLoading(false);

      }

    }, [id]);



  const loadListings =

    useCallback(async () => {

      if (!id) {

        setListings([]);

        setListingsLoading(false);

        return;

      }



      try {

        setListingsLoading(true);

        setListingsError("");



        const response =

          await travelApi.get(

            "/travel/listings?limit=100",

          );



        const payload =

          getApiPayload(response);



        const allListings =

          unwrapListings(payload);



        const partnerIds =

          new Set(

            [

              id,

              getString(partner?._id),

              getString(partner?.id),

              getString(partner?.userId),

            ].filter(Boolean),

          );



        const publicListings =

          allListings.filter(

            (listing) => {

              if (

                !isPublishedListing(

                  listing,

                )

              ) {

                return false;

              }



              const identifiers =

                getListingPartnerIdentifiers(

                  listing,

                );



              return identifiers.some(

                (identifier) =>

                  partnerIds.has(

                    identifier,

                  ),

              );

            },

          );



        setListings(

          publicListings,

        );

      } catch (requestError) {

        console.error(

          "Failed to load business listings:",

          requestError,

        );



        setListings([]);



        setListingsError(

          "We could not load this business's listings right now.",

        );

      } finally {

        setListingsLoading(false);

      }

    }, [id, partner]);



  useEffect(() => {

    void loadBusiness();

  }, [loadBusiness]);



  useEffect(() => {

    void loadListings();

  }, [loadListings]);



  const businessName =

    partner?.businessName ||

    "Travel Business";



  const location = partner

    ? getBusinessLocation(partner)

    : "";



  const addressLine = partner

    ? getBusinessAddressLine(partner)

    : "";



  const category = partner

    ? getCategory(partner)

    : "Travel Business";



  const logo = partner

    ? getPartnerLogo(partner)

    : "";



  const cover = partner

    ? getPartnerCover(partner)

    : "";



  const acceptingBookings =

    partner?.acceptingBookings !== false;



  const businessInitials =

    getBusinessInitials(

      businessName,

    );



  const activeServices =

    useMemo(() => {

      if (

        !partner ||

        !Array.isArray(

          partner.services,

        )

      ) {

        return [];

      }



      return partner.services.filter(

        (service) =>

          service &&

          service.active !== false &&

          Boolean(

            getString(

              service.name,

            ),

          ),

      );

    }, [partner]);



  const amenities =

    useMemo(() => {

      if (

        !partner ||

        !Array.isArray(

          partner.amenities,

        )

      ) {

        return [];

      }



      return partner.amenities

        .map(getString)

        .filter(Boolean);

    }, [partner]);



  const hasListings =

    listings.length > 0;



  const websiteUrl =

    partner?.website

      ? /^https?:\/\//i.test(

          partner.website,

        )

        ? partner.website

        : `https://${partner.website}`

      : "";



  const handleRetry =

    useCallback(() => {

      void loadBusiness();

      void loadListings();

    }, [

      loadBusiness,

      loadListings,

    ]);



  if (loading) {

    return (

      <div className="travel-business-page">

        <div

          className="travel-business-container"

          style={{

            paddingTop: 40,

            paddingBottom: 60,

          }}

        >

          <button

            type="button"

            className="btn btn-outline"

            onClick={() =>

              navigate("/travel")

            }

          >

            <ArrowLeft size={18} />

            Back to Travel

          </button>



          <div

            style={{

              padding: "70px 20px",

              textAlign: "center",

            }}

          >

            <RefreshCw

              size={28}

              className="travel-spin"

            />



            <h2

              style={{

                marginTop: 18,

              }}

            >

              Loading business...

            </h2>

          </div>

        </div>

      </div>

    );

  }



  if (error || !partner) {

    return (

      <div className="travel-business-page">

        <div

          className="travel-business-container"

          style={{

            paddingTop: 40,

            paddingBottom: 60,

          }}

        >

          <button

            type="button"

            className="btn btn-outline"

            onClick={() =>

              navigate("/travel")

            }

          >

            <ArrowLeft size={18} />

            Back to Travel

          </button>



          <div

            style={{

              marginTop: 40,

              padding: 40,

              textAlign: "center",

              borderRadius: 18,

              border:

                "1px solid rgba(0,0,0,.1)",

              background: "#fff",

            }}

          >

            <h2>

              Business unavailable

            </h2>



            <p

              style={{

                marginTop: 10,

                color: "#666",

              }}

            >

              {error ||

                "This business could not be found."}

            </p>



            <button

              type="button"

              className="btn btn-primary"

              style={{

                marginTop: 20,

              }}

              onClick={handleRetry}

            >

              <RefreshCw size={17} />

              Try again

            </button>

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="travel-business-page">

      <div className="travel-business-container">

        <div

          style={{

            paddingTop: 24,

          }}

        >

          <button

            type="button"

            className="btn btn-outline"

            onClick={() =>

              navigate("/travel")

            }

          >

            <ArrowLeft size={18} />

            Back to Travel

          </button>

        </div>



        <section

          className="travel-business-hero"

          style={{

            marginTop: 22,

            overflow: "hidden",

            borderRadius: 22,

            background: "#fff",

            border:

              "1px solid rgba(22,58,95,.12)",

          }}

        >

          <div

            className="travel-business-cover"

            style={{

              minHeight: 260,



              backgroundImage: cover

                ? `linear-gradient(rgba(0,0,0,.24), rgba(0,0,0,.58)), url("${cover}")`

                : "linear-gradient(135deg, #163a5f, #315b83)",



              backgroundSize: "cover",

              backgroundPosition: "center",

              backgroundRepeat: "no-repeat",



              position: "relative",

            }}

          >

            {cover && (

              <img

                src={cover}

                alt=""

                aria-hidden="true"

                style={{

                  position: "absolute",

                  inset: 0,

                  width: "100%",

                  height: "100%",

                  objectFit: "cover",

                  zIndex: 0,

                  pointerEvents: "none",

                }}

                onError={(event) => {

                  console.error(

                    "[Fockis Travel] Cover image failed to load:",

                    cover,

                  );



                  event.currentTarget.style.display =

                    "none";

                }}

              />

            )}



            <div

              style={{

                position: "absolute",

                inset: 0,

                background:

                  "linear-gradient(rgba(0,0,0,.20), rgba(0,0,0,.60))",

                zIndex: 1,

              }}

            />



            <div

              style={{

                position: "absolute",

                inset: 0,

                display: "flex",

                alignItems: "flex-end",

                padding: 30,

                zIndex: 2,

              }}

            >

              <div

                style={{

                  display: "flex",

                  gap: 20,

                  alignItems: "flex-end",

                  width: "100%",

                }}

              >

                <div

                  style={{

                    width: 104,

                    height: 104,

                    borderRadius: 20,

                    background: "#fff",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    overflow: "hidden",

                    flexShrink: 0,

                    boxShadow:

                      "0 12px 30px rgba(0,0,0,.25)",

                  }}

                >

                  {logo ? (

                    <img

                      src={logo}

                      alt={businessName}

                      style={{

                        width: "100%",

                        height: "100%",

                        objectFit: "cover",

                      }}

                      onError={(

                        event,

                      ) => {

                        event.currentTarget.style.display =

                          "none";

                      }}

                    />

                  ) : (

                    <span

                      style={{

                        fontSize: 32,

                        fontWeight: 800,

                        color: "#163a5f",

                      }}

                    >

                      {businessInitials}

                    </span>

                  )}

                </div>



                <div

                  style={{

                    color: "#fff",

                    minWidth: 0,

                  }}

                >

                  <div

                    style={{

                      display: "flex",

                      flexWrap: "wrap",

                      gap: 8,

                      alignItems: "center",

                      marginBottom: 8,

                    }}

                  >

                    <span

                      style={{

                        display:

                          "inline-flex",

                        alignItems:

                          "center",

                        gap: 5,

                        padding:

                          "5px 9px",

                        borderRadius: 999,

                        background:

                          "rgba(255,255,255,.18)",

                        fontSize: 13,

                        fontWeight: 700,

                      }}

                    >

                      <ShieldCheck

                        size={15}

                      />

                      Verified business

                    </span>



                    {partner.featured && (

                      <span

                        style={{

                          display:

                            "inline-flex",

                          alignItems:

                            "center",

                          gap: 5,

                          padding:

                            "5px 9px",

                          borderRadius: 999,

                          background:

                            "rgba(184,134,47,.95)",

                          fontSize: 13,

                          fontWeight: 700,

                        }}

                      >

                        <Star

                          size={14}

                          fill="currentColor"

                        />

                        Featured

                      </span>

                    )}

                  </div>



                  <h1

                    style={{

                      margin: 0,

                      fontSize:

                        "clamp(28px, 5vw, 46px)",

                      lineHeight: 1.05,

                    }}

                  >

                    {businessName}

                  </h1>



                  <div

                    style={{

                      marginTop: 10,

                      display: "flex",

                      flexWrap: "wrap",

                      gap: 12,

                      fontSize: 15,

                    }}

                  >

                    <span>

                      {category}

                    </span>



                    {location && (

                      <span

                        style={{

                          display:

                            "inline-flex",

                          alignItems:

                            "center",

                          gap: 5,

                        }}

                      >

                        <MapPin

                          size={16}

                        />

                        {location}

                      </span>

                    )}

                  </div>

                </div>

              </div>

            </div>

          </div>



          <div

            style={{

              padding: "22px 28px",

              display: "flex",

              flexWrap: "wrap",

              justifyContent:

                "space-between",

              gap: 16,

              alignItems: "center",

            }}

          >

            <div>

              <strong>

                {listings.length}

              </strong>{" "}

              published{" "}

              {listings.length === 1

                ? "listing"

                : "listings"}

            </div>



            <div

              style={{

                display: "flex",

                flexWrap: "wrap",

                gap: 10,

              }}

            >

              {acceptingBookings &&

                hasListings && (

                  <a

                    href="#business-listings"

                    className="btn btn-primary"

                  >

                    Book a listing

                  </a>

                )}



              {!acceptingBookings && (

                <span

                  style={{

                    padding:

                      "9px 13px",

                    borderRadius: 999,

                    background: "#f4f4f4",

                    color: "#666",

                    fontSize: 14,

                    fontWeight: 600,

                  }}

                >

                  Reservations currently

                  unavailable

                </span>

              )}

            </div>

          </div>

        </section>



        <section

          style={{

            display: "grid",

            gridTemplateColumns:

              "minmax(0, 1.5fr) minmax(280px, .8fr)",

            gap: 24,

            marginTop: 24,

          }}

        >

          <div>

            <div

              style={{

                background: "#fff",

                border:

                  "1px solid rgba(22,58,95,.12)",

                borderRadius: 18,

                padding: 26,

              }}

            >

              <h2

                style={{

                  marginTop: 0,

                }}

              >

                About this business

              </h2>



              <p

                style={{

                  color: "#555",

                  lineHeight: 1.75,

                  whiteSpace:

                    "pre-wrap",

                }}

              >

                {partner.description ||

                  "This Travel business has not added a public description yet."}

              </p>



              {addressLine && (

                <div

                  style={{

                    display: "flex",

                    gap: 12,

                    marginTop: 20,

                    alignItems:

                      "flex-start",

                  }}

                >

                  <MapPin

                    size={20}

                    style={{

                      marginTop: 2,

                      color: "#163a5f",

                      flexShrink: 0,

                    }}

                  />



                  <div>

                    <strong>

                      Address

                    </strong>



                    <div

                      style={{

                        marginTop: 4,

                        color: "#666",

                      }}

                    >

                      {addressLine}

                    </div>

                  </div>

                </div>

              )}

            </div>



            {activeServices.length >

              0 && (

              <div

                style={{

                  background: "#fff",

                  border:

                    "1px solid rgba(22,58,95,.12)",

                  borderRadius: 18,

                  padding: 26,

                  marginTop: 24,

                }}

              >

                <h2

                  style={{

                    marginTop: 0,

                  }}

                >

                  Services

                </h2>



                <div

                  style={{

                    display: "grid",

                    gridTemplateColumns:

                      "repeat(auto-fit, minmax(220px, 1fr))",

                    gap: 14,

                  }}

                >

                  {activeServices.map(

                    (

                      service,

                      index,

                    ) => (

                      <div

                        key={`${getString(

                          service.name,

                        )}-${index}`}

                        style={{

                          padding: 16,

                          borderRadius: 14,

                          border:

                            "1px solid rgba(0,0,0,.08)",

                          background:

                            "#fafafa",

                        }}

                      >

                        <strong>

                          {

                            service.name

                          }

                        </strong>



                        {service.description && (

                          <p

                            style={{

                              margin:

                                "7px 0 0",

                              color: "#666",

                              lineHeight:

                                1.5,

                            }}

                          >

                            {

                              service.description

                            }

                          </p>

                        )}



                        {getNumber(

                          service.price,

                        ) !== null && (

                          <div

                            style={{

                              marginTop: 10,

                              fontWeight: 700,

                              color:

                                "#163a5f",

                            }}

                          >

                            {formatPrice(

                              getNumber(

                                service.price,

                              ),

                              service.currency,

                            )}

                          </div>

                        )}

                      </div>

                    ),

                  )}

                </div>

              </div>

            )}



            {amenities.length >

              0 && (

              <div

                style={{

                  background: "#fff",

                  border:

                    "1px solid rgba(22,58,95,.12)",

                  borderRadius: 18,

                  padding: 26,

                  marginTop: 24,

                }}

              >

                <h2

                  style={{

                    marginTop: 0,

                  }}

                >

                  Amenities

                </h2>



                <div

                  style={{

                    display: "flex",

                    flexWrap: "wrap",

                    gap: 9,

                  }}

                >

                  {amenities.map(

                    (amenity) => (

                      <span

                        key={amenity}

                        style={{

                          padding:

                            "8px 12px",

                          borderRadius: 999,

                          background:

                            "#eef4f9",

                          color:

                            "#163a5f",

                          fontWeight: 600,

                          fontSize: 14,

                        }}

                      >

                        {amenity}

                      </span>

                    ),

                  )}

                </div>

              </div>

            )}



            <section

              id="business-listings"

              style={{

                marginTop: 24,

              }}

            >

              <div

                style={{

                  display: "flex",

                  justifyContent:

                    "space-between",

                  gap: 16,

                  alignItems: "center",

                  marginBottom: 16,

                }}

              >

                <div>

                  <h2

                    style={{

                      margin: 0,

                    }}

                  >

                    Book from this business

                  </h2>



                  <p

                    style={{

                      margin:

                        "6px 0 0",

                      color: "#666",

                    }}

                  >

                    Choose a published

                    listing to view

                    details and make a

                    reservation.

                  </p>

                </div>

              </div>



              {listingsLoading ? (

                <div

                  style={{

                    padding: 36,

                    background: "#fff",

                    border:

                      "1px solid rgba(22,58,95,.12)",

                    borderRadius: 18,

                    textAlign:

                      "center",

                  }}

                >

                  <RefreshCw

                    size={25}

                    className="travel-spin"

                  />



                  <div

                    style={{

                      marginTop: 10,

                      color: "#666",

                    }}

                  >

                    Loading available

                    listings...

                  </div>

                </div>

              ) : listingsError ? (

                <div

                  style={{

                    padding: 30,

                    background: "#fff",

                    border:

                      "1px solid rgba(22,58,95,.12)",

                    borderRadius: 18,

                  }}

                >

                  <p

                    style={{

                      marginTop: 0,

                    }}

                  >

                    {listingsError}

                  </p>



                  <button

                    type="button"

                    className="btn btn-outline"

                    onClick={() =>

                      void loadListings()

                    }

                  >

                    <RefreshCw

                      size={17}

                    />

                    Try again

                  </button>

                </div>

              ) : !hasListings ? (

                <div

                  style={{

                    padding: 40,

                    background: "#fff",

                    border:

                      "1px solid rgba(22,58,95,.12)",

                    borderRadius: 18,

                    textAlign:

                      "center",

                  }}

                >

                  <div

                    style={{

                      width: 58,

                      height: 58,

                      margin:

                        "0 auto 16px",

                      borderRadius:

                        "50%",

                      display: "flex",

                      alignItems:

                        "center",

                      justifyContent:

                        "center",

                      background:

                        "#eef4f9",

                      color:

                        "#163a5f",

                    }}

                  >

                    <Globe2

                      size={27}

                    />

                  </div>



                  <h3

                    style={{

                      margin: 0,

                    }}

                  >

                    No listings available

                    yet

                  </h3>



                  <p

                    style={{

                      maxWidth: 560,

                      margin:

                        "10px auto 0",

                      color: "#666",

                      lineHeight: 1.6,

                    }}

                  >

                    This business is

                    preparing its first

                    Travel listing. Once a

                    listing is published,

                    it will appear here and

                    customers will be able

                    to make reservations.

                  </p>

                </div>

              ) : (

                <div

                  style={{

                    display: "grid",

                    gridTemplateColumns:

                      "repeat(auto-fit, minmax(280px, 1fr))",

                    gap: 18,

                  }}

                >

                  {listings.map(

                    (listing) => {

                      const listingId =

                        getListingId(

                          listing,

                        );



                      const title =

                        getListingTitle(

                          listing,

                        );



                      const image =

                        getListingImage(

                          listing,

                        );



                      const listingCategory =

                        getListingCategory(

                          listing,

                        );



                      const price =

                        getNumber(

                          listing.price,

                        );



                      return (

                        <article

                          key={

                            listingId ||

                            title

                          }

                          style={{

                            overflow:

                              "hidden",

                            background:

                              "#fff",

                            border:

                              "1px solid rgba(22,58,95,.12)",

                            borderRadius: 18,

                          }}

                        >

                          <div

                            style={{

                              height: 190,

                              background:

                                image

                                  ? `url("${image}") center / cover`

                                  : "linear-gradient(135deg, #163a5f, #315b83)",

                              display:

                                "flex",

                              alignItems:

                                "flex-end",

                              padding: 14,

                              position:

                                "relative",

                              overflow:

                                "hidden",

                            }}

                          >

                            {image && (

                              <img

                                src={image}

                                alt=""

                                aria-hidden="true"

                                style={{

                                  position:

                                    "absolute",

                                  inset: 0,

                                  width:

                                    "100%",

                                  height:

                                    "100%",

                                  objectFit:

                                    "cover",

                                }}

                                onError={(

                                  event,

                                ) => {

                                  event.currentTarget.style.display =

                                    "none";

                                }}

                              />

                            )}



                            <span

                              style={{

                                display:

                                  "inline-flex",

                                padding:

                                  "6px 10px",

                                borderRadius:

                                  999,

                                background:

                                  "rgba(255,255,255,.94)",

                                color:

                                  "#163a5f",

                                fontSize: 12,

                                fontWeight: 800,

                                position:

                                  "relative",

                                zIndex: 2,

                              }}

                            >

                              {

                                listingCategory

                              }

                            </span>

                          </div>



                          <div

                            style={{

                              padding: 20,

                            }}

                          >

                            <h3

                              style={{

                                margin: 0,

                                fontSize: 21,

                              }}

                            >

                              {title}

                            </h3>



                            {listing.description && (

                              <p

                                style={{

                                  margin:

                                    "10px 0 0",

                                  color:

                                    "#666",

                                  lineHeight:

                                    1.55,

                                  display:

                                    "-webkit-box",

                                  WebkitLineClamp:

                                    3,

                                  WebkitBoxOrient:

                                    "vertical",

                                  overflow:

                                    "hidden",

                                }}

                              >

                                {

                                  listing.description

                                }

                              </p>

                            )}



                            <div

                              style={{

                                marginTop: 16,

                                fontWeight: 800,

                                color:

                                  "#163a5f",

                                fontSize: 17,

                              }}

                            >

                              {formatPrice(

                                price,

                                getString(

                                  listing.currency,

                                ),

                              )}

                            </div>



                            <div

                              style={{

                                display:

                                  "flex",

                                flexWrap:

                                  "wrap",

                                gap: 10,

                                marginTop:

                                  18,

                              }}

                            >

                              {listingId &&

                                acceptingBookings && (

                                  <Link

                                    to={`/travel/booking/${encodeURIComponent(

                                      listingId,

                                    )}`}

                                    className="btn btn-primary"

                                  >

                                    Reserve now

                                  </Link>

                                )}



                              {listingId && (

                                <Link

                                  to={`/travel/stays/${encodeURIComponent(

                                    listingId,

                                  )}`}

                                  className="btn btn-outline"

                                >

                                  View listing

                                </Link>

                              )}

                            </div>



                            {!acceptingBookings && (

                              <div

                                style={{

                                  marginTop:

                                    12,

                                  fontSize:

                                    13,

                                  color:

                                    "#777",

                                }}

                              >

                                This business

                                is not

                                currently

                                accepting

                                reservations.

                              </div>

                            )}



                            {acceptingBookings &&

                              !listingId && (

                                <div

                                  style={{

                                    marginTop:

                                      12,

                                    fontSize:

                                      13,

                                    color:

                                      "#777",

                                  }}

                                >

                                  Booking is

                                  temporarily

                                  unavailable

                                  for this

                                  listing.

                                </div>

                              )}

                          </div>

                        </article>

                      );

                    },

                  )}

                </div>

              )}

            </section>

          </div>



          <aside>

            <div

              style={{

                background: "#fff",

                border:

                  "1px solid rgba(22,58,95,.12)",

                borderRadius: 18,

                padding: 22,

                position: "sticky",

                top: 20,

              }}

            >

              <h3

                style={{

                  marginTop: 0,

                }}

              >

                Contact this business

              </h3>



              {partner.email && (

                <a

                  href={`mailto:${partner.email}`}

                  style={{

                    display: "flex",

                    gap: 10,

                    alignItems:

                      "center",

                    marginTop: 14,

                    color: "#163a5f",

                    textDecoration:

                      "none",

                  }}

                >

                  <Mail size={18} />



                  <span

                    style={{

                      overflowWrap:

                        "anywhere",

                    }}

                  >

                    {partner.email}

                  </span>

                </a>

              )}



              {partner.phone && (

                <a

                  href={`tel:${partner.phone}`}

                  style={{

                    display: "flex",

                    gap: 10,

                    alignItems:

                      "center",

                    marginTop: 14,

                    color: "#163a5f",

                    textDecoration:

                      "none",

                  }}

                >

                  <Phone size={18} />



                  <span>

                    {partner.phone}

                  </span>

                </a>

              )}



              {partner.website && (

                <a

                  href={websiteUrl}

                  target="_blank"

                  rel="noreferrer"

                  style={{

                    display: "flex",

                    gap: 10,

                    alignItems:

                      "center",

                    marginTop: 14,

                    color: "#163a5f",

                    textDecoration:

                      "none",

                  }}

                >

                  <Globe2 size={18} />



                  <span

                    style={{

                      overflowWrap:

                        "anywhere",

                    }}

                  >

                    {partner.website}

                  </span>

                </a>

              )}



              {partner.status ===

                "verified" && (

                <div

                  style={{

                    display: "flex",

                    gap: 9,

                    alignItems:

                      "center",

                    marginTop: 22,

                    padding:

                      "12px 13px",

                    borderRadius: 12,

                    background:

                      "#eef7ef",

                    color: "#256b35",

                    fontSize: 14,

                    fontWeight: 700,

                  }}

                >

                  <CheckCircle2

                    size={18}

                  />

                  Verified Travel

                  business

                </div>

              )}



              {acceptingBookings &&

                hasListings && (

                  <a

                    href="#business-listings"

                    className="btn btn-primary"

                    style={{

                      width: "100%",

                      justifyContent:

                        "center",

                      marginTop: 18,

                    }}

                  >

                    Book now

                  </a>

                )}

            </div>

          </aside>

        </section>

      </div>

    </div>

  );

}