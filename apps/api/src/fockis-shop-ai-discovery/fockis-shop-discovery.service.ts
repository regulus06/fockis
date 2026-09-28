import {

  BadRequestException,

  Injectable,

  Logger,

} from "@nestjs/common";



import { InjectConnection } from "@nestjs/mongoose";



import {

  Connection,

  Types,

} from "mongoose";



import {

  FockisShopDiscoveryQuery,

  FockisShopDiscoveryResult,

  FockisShopDiscoveryResultItem,
  FockisShopPublicHours,

} from "./fockis-shop-discovery.types";



// ─────────────────────────────────────────────

// SERVICE

// ─────────────────────────────────────────────



@Injectable()

export class FockisShopDiscoveryService {

  private readonly logger =

    new Logger(

      FockisShopDiscoveryService.name,

    );



  private readonly maxLimit = 10;



  constructor(

    @InjectConnection()

    private readonly connection: Connection,

  ) {}



  // ─────────────────────────────────────────

  // MAIN SEARCH

  // ─────────────────────────────────────────



  async search(

    request: FockisShopDiscoveryQuery,

  ): Promise<FockisShopDiscoveryResult> {

    if (!request?.tool) {

      throw new BadRequestException(

        "A Fockis Shop discovery tool is required.",

      );

    }



    const limit =

      this.normalizeLimit(

        request.limit,

      );



    const query =

      this.clean(request.query);



    switch (request.tool) {

      case "search_fockis_products":

        return this.searchProducts(

          query,

          request,

          limit,

        );



      case "search_fockis_stores":

        return this.searchStores(

          query,

          request,

          limit,

        );



      case "search_fockis_businesses":

        return this.searchBusinesses(

          query,

          request,

          limit,

        );



      default:

        throw new BadRequestException(

          `Unsupported Fockis Shop discovery tool: ${request.tool}`,

        );

    }

  }



  // ─────────────────────────────────────────

  // PRODUCT SEARCH

  // ─────────────────────────────────────────



  private async searchProducts(

    query: string,

    request: FockisShopDiscoveryQuery,

    limit: number,

  ): Promise<FockisShopDiscoveryResult> {

    const products =

      this.collection("products");



    const filter: Record<

      string,

      any

    > = {

      isActive: true,



      displayLocations: {

        $in: ["marketplace"],

      },

    };



    const conditions =

      this.textConditions(

        query,

        [

          "name",

          "description",

          "brand",

          "category",

          "location",

        ],

      );



    if (conditions.length) {

      filter.$or = conditions;

    }



    // Category

    if (request.category) {

      filter.category = {

        $regex: this.escape(

          request.category,

        ),

        $options: "i",

      };

    }



    // Price

    if (

      request.minPrice !==

        undefined ||

      request.maxPrice !==

        undefined

    ) {

      filter.price = {};



      if (

        typeof request.minPrice ===

        "number"

      ) {

        filter.price.$gte =

          request.minPrice;

      }



      if (

        typeof request.maxPrice ===

        "number"

      ) {

        filter.price.$lte =

          request.maxPrice;

      }

    }



    // City

    if (request.city) {

      filter.location = {

        $regex: this.escape(

          request.city,

        ),

        $options: "i",

      };

    }



    // Availability

    if (

      /\b(in stock|available|availability|can i buy|buy)\b/i.test(

        query,

      )

    ) {

      filter.stock = {

        $gt: 0,

      };

    }



    let documents =
      await products
        .find(filter)
        .sort({
          rating: -1,
          totalReviews: -1,
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    // Natural-language fallback.
    //
    // Example:
    // "Find me a mug on Fockis Shop"
    //
    // The complete sentence will not match a product named "Mug".
    // If the phrase search returns nothing, search the meaningful
    // product terms while preserving the existing filters.

    if (!documents.length && query) {
      const terms =
        this.productSearchTerms(query);

      if (terms.length) {
        const fallbackFilter: Record<string, any> = {
          ...filter,
          $or: terms.flatMap((term) =>
            [
              "name",
              "description",
              "brand",
              "category",
              "location",
            ].map((field) => ({
              [field]: {
                $regex: this.escape(term),
                $options: "i",
              },
            })),
          ),
        };

        documents =
          await products
            .find(fallbackFilter)
            .sort({
              rating: -1,
              totalReviews: -1,
              createdAt: -1,
            })
            .limit(limit)
            .toArray();
      }
    }

    // ───────────────────────────────────────

    // LOAD RELATED STORES

    // ───────────────────────────────────────



    const storeIds =

      documents

        .map(

          (product: any) =>

            product?.storeId,

        )

        .filter(Boolean)

        .map((id: unknown) =>

          String(id),

        )

        .filter((id) =>

          this.isObjectId(id),

        );



    const stores =

      storeIds.length

        ? await this.collection(

            "stores",

          )

            .find({

              _id: {

                $in: storeIds.map(

                  (id) =>

                    this.toObjectId(id),

                ),

              },



              active: true,

            })

            .project({

              name: 1,

              slug: 1,

              logo: 1,

              verified: 1,

              city: 1,

              state: 1,

              country: 1,



              // Public contact fields only.

              publicEmail: 1,

              publicPhone: 1,

              publicWebsite: 1,

              website: 1,

              websiteUrl: 1,



              publicAddress: 1,

              publicContact: 1,

              contact: 1,



              showEmail: 1,

              showPhone: 1,

              showAddress: 1,

              emailPublic: 1,

              phonePublic: 1,

              addressPublic: 1,

            })

            .toArray()

        : [];



    const storeMap =

      new Map(

        stores.map(

          (store: any) => [

            String(store._id),

            store,

          ],

        ),

      );



    // ───────────────────────────────────────

    // MAP RESULTS

    // ───────────────────────────────────────



    const results =

      documents

        .map(

          (product: any) =>

            this.mapProduct(

              product,

              storeMap.get(

                String(

                  product?.storeId,

                ),

              ),

            ),

        )

        .filter(

          (

            item,

          ): item is FockisShopDiscoveryResultItem =>

            Boolean(item),

        );



    return this.result(

      "search_fockis_products",

      query,

      results,

    );

  }



  // ─────────────────────────────────────────

  // STORE SEARCH

  // ─────────────────────────────────────────



  private productSearchTerms(
    query: string,
  ): string[] {
    const stopWords = new Set([
      "a",
      "an",
      "and",
      "any",
      "available",
      "buy",
      "can",
      "find",
      "for",
      "fockis",
      "get",
      "give",
      "i",
      "in",
      "looking",
      "me",
      "need",
      "of",
      "on",
      "please",
      "product",
      "products",
      "search",
      "shop",
      "show",
      "some",
      "the",
      "to",
      "want",
      "where",
      "with",
    ]);

    return [
      ...new Set(
        query
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .split(/\s+/)
          .map((term) => term.trim())
          .filter(
            (term) =>
              term.length >= 2 &&
              !stopWords.has(term),
          ),
      ),
    ].slice(0, 8);
  }


  private async searchStores(

    query: string,

    request: FockisShopDiscoveryQuery,

    limit: number,

  ): Promise<FockisShopDiscoveryResult> {

    const stores =

      this.collection("stores");



    const filter: Record<

      string,

      any

    > = {

      active: true,

    };



    const conditions =

      this.textConditions(

        query,

        [

          "name",

          "description",

          "slug",

          "category",

          "categories",

          "city",

          "state",

          "country",

        ],

      );



    if (conditions.length) {

      filter.$or = conditions;

    }



    this.addLocation(

      filter,

      request,

    );



    if (request.category) {

      filter.$or = [

        ...(Array.isArray(

          filter.$or,

        )

          ? filter.$or

          : []),



        {

          category: {

            $regex: this.escape(

              request.category,

            ),

            $options: "i",

          },

        },



        {

          categories: {

            $regex: this.escape(

              request.category,

            ),

            $options: "i",

          },

        },

      ];

    }



    const documents =

      await stores

        .find(filter)

        .sort({

          verified: -1,

          createdAt: -1,

        })

        .limit(limit)

        .project({

          name: 1,

          slug: 1,

          description: 1,

          logo: 1,



          category: 1,

          categories: 1,

          verified: 1,

          rating: 1,

          averageRating: 1,

          followersCount: 1,

          followers: 1,



          city: 1,

          state: 1,

          country: 1,



          // Explicitly public contact fields.

          publicEmail: 1,

          publicPhone: 1,

          publicWebsite: 1,



          website: 1,

          websiteUrl: 1,



          publicAddress: 1,

          publicContact: 1,

          contact: 1,



          showEmail: 1,

          showPhone: 1,

          showAddress: 1,

          emailPublic: 1,

          phonePublic: 1,

          addressPublic: 1,

        })

        .toArray();



    const results =

      documents.map(

        (store: any) =>

          this.mapStore(store),

      );



    return this.result(

      "search_fockis_stores",

      query,

      results,

    );

  }



  // ─────────────────────────────────────────

  // BUSINESS SEARCH

  // ─────────────────────────────────────────



  private async searchBusinesses(

    query: string,

    request: FockisShopDiscoveryQuery,

    limit: number,

  ): Promise<FockisShopDiscoveryResult> {

    const businesses =

      this.collection(

        "businesses",

      );



    const filter: Record<

      string,

      any

    > = {

      status: "active",

      feedEnabled: true,

    };



    const conditions =

      this.textConditions(

        query,

        [

          "name",

          "description",

          "category",

          "city",

          "state",

          "country",

          "address",

        ],

      );



    if (conditions.length) {

      filter.$or = conditions;

    }



    if (request.category) {

      filter.category = {

        $regex: this.escape(

          request.category,

        ),

        $options: "i",

      };

    }



    this.addLocation(

      filter,

      request,

    );



    const documents =

      await businesses

        .find(filter)

        .sort({

          verified: -1,

          spotlightPriority: -1,

          createdAt: -1,

        })

        .limit(limit)

        .project({

          name: 1,

          description: 1,



          logoUrl: 1,

          coverImageUrl: 1,



          category: 1,

          verified: 1,



          city: 1,

          state: 1,

          stateProvince: 1,

          country: 1,



          // Public contact information.

          publicEmail: 1,

          publicPhone: 1,

          publicWebsite: 1,



          publicAddress: 1,

          publicContact: 1,

          contact: 1,



          showEmail: 1,

          showPhone: 1,

          showAddress: 1,



          emailPublic: 1,

          phonePublic: 1,

          addressPublic: 1,



          // Public business information.

          website: 1,

          websiteUrl: 1,



          hours: 1,

          businessHours: 1,



          socialLinks: 1,

          social: 1,



          storeSlug: 1,

          store: 1,



          // We only use storeId internally

          // to determine a public store link.

          storeId: 1,



          // We deliberately DO NOT project:

          // ownerId

          // userId

          // sellerId

          // customer data

          // private email

          // private phone

          // private address

          // payment data

          // authentication data

        })

        .toArray();



    const results =

      documents.map(

        (business: any) =>

          this.mapBusiness(

            business,

          ),

      );



    return this.result(

      "search_fockis_businesses",

      query,

      results,

    );

  }



  // ─────────────────────────────────────────

  // MAP PRODUCT

  // ─────────────────────────────────────────



  private mapProduct(

    product: any,

    store?: any,

  ): FockisShopDiscoveryResultItem | null {

    const id = this.id(

      product?._id ??

        product?.id,

    );



    if (!id) {

      return null;

    }



    const storeSlug =

      store?.slug

        ? String(store.slug)

        : undefined;



    const publicStoreContact =

      store

        ? this.publicContact(

            store,

          )

        : undefined;



    const storeLocation =

      store

        ? this.location(store)

        : undefined;



    const productLocation =

      this.location(product);



    return {

      id,



      type: "product",



      title: String(

        product?.name ??

          product?.title ??

          "Fockis product",

      ),



      description:

        this.optionalString(

          product?.description,

        ),



      price:

        this.numberOrUndefined(

          product?.price,

        ),



      stock:

        this.numberOrUndefined(

          product?.stock,

        ),



      image:

        this.firstImage(

          product?.images,

        ),



      location:

        productLocation,



      urls: {

        product:

          `/shop/products/${encodeURIComponent(id)}`,



        marketplace:

          `/marketplace/product/${encodeURIComponent(id)}`,



        ...(storeSlug

          ? {

              store:

                `/shop/store/${encodeURIComponent(storeSlug)}`,

            }

          : {}),

      },



      store: store

        ? {

            /*

             * This is a public storefront

             * identifier used by the UI.

             *

             * We do NOT expose sellerId,

             * ownerId, or userId.

             */

            name:

              this.optionalString(

                store.name,

              ),



            slug:

              storeSlug,



            verified:

              typeof store.verified ===

              "boolean"

                ? store.verified

                : undefined,



            location:

              storeLocation,



            contact:

              publicStoreContact,

          }

        : undefined,



      metadata: {

        category:

          this.optionalString(

            product?.category,

          ),



        brand:

          this.optionalString(

            product?.brand,

          ),



        rating:

          this.numberOrUndefined(

            product?.rating,

          ),



        totalReviews:

          this.numberOrUndefined(

            product?.totalReviews,

          ),



        discount:

          this.numberOrUndefined(

            product?.discount,

          ),



        discountPrice:

          this.numberOrUndefined(

            product?.discountPrice,

          ),



        displayLocations:

          this.publicDisplayLocations(

            product?.displayLocations,

          ),

      },

    };

  }



  // ─────────────────────────────────────────

  // MAP STORE

  // ─────────────────────────────────────────



  private mapStore(

    store: any,

  ): FockisShopDiscoveryResultItem {

    const id =

      this.id(

        store?._id ??

          store?.id,

      );



    const slug =

      this.optionalString(

        store?.slug,

      );



    return {

      /*

       * Resource ID is used by the

       * application internally for the

       * public storefront result.

       *

       * No owner/user/seller ID is exposed.

       */

      id,



      type: "store",



      title: String(

        store?.name ??

          "Fockis Store",

      ),



      description:

        this.optionalString(

          store?.description,

        ),



      image:

        this.optionalString(

          store?.logo,

        ),



      location:

        this.location(store),



      urls: slug

        ? {

            store:

              `/shop/store/${encodeURIComponent(slug)}`,

          }

        : undefined,



      metadata: {

        slug,



        category:

          this.optionalString(

            store?.category,

          ),



        categories:

          this.publicStringArray(

            store?.categories,

          ),



        verified:

          typeof store?.verified ===

          "boolean"

            ? store.verified

            : undefined,



        rating:

          this.numberOrUndefined(

            store?.rating ??

              store?.averageRating,

          ),



        followers:

          this.numberOrUndefined(

            store?.followersCount ??

              store?.followers,

          ),



        contact:

          this.publicContact(store),

      },

    };

  }



  // ─────────────────────────────────────────

  // MAP BUSINESS

  // ─────────────────────────────────────────



  private mapBusiness(

    business: any,

  ): FockisShopDiscoveryResultItem {

    const id =

      this.id(

        business?._id ??

          business?.id,

      );



    const businessUrl =

      id

        ? `/businesses/${encodeURIComponent(id)}`

        : undefined;



    const storeSlug =

      this.optionalString(

        business?.storeSlug ??

          business?.store?.slug,

      );



    const storeUrl =

      storeSlug

        ? `/shop/store/${encodeURIComponent(storeSlug)}`

        : undefined;



    /*

     * Only explicitly public contact

     * information is returned.

     */

    const publicContact =

      this.publicContact(

        business,

      );



    const publicHours =

      this.publicHours(

        business,

      );



    const publicSocialLinks =

      this.publicSocialLinks(

        business,

      );



    return {

      /*

       * Public business resource identifier.

       *

       * We do NOT expose:

       * ownerId

       * userId

       * sellerId

       * customer IDs

       */

      id,



      type: "business",



      title: String(

        business?.name ??

          "Fockis business",

      ),



      description:

        this.optionalString(

          business?.description,

        ),



      image:

        this.optionalString(

          business?.logoUrl,

        ) ??

        this.optionalString(

          business?.coverImageUrl,

        ),



      location:

        this.location(

          business,

        ),



      urls: {

        ...(businessUrl

          ? {

              business:

                businessUrl,

            }

          : {}),



        ...(storeUrl

          ? {

              store:

                storeUrl,

            }

          : {}),

      },



      metadata: {

        category:

          this.optionalString(

            business?.category,

          ),



        verified:

          typeof business?.verified ===

          "boolean"

            ? business.verified

            : undefined,



        contact:

          publicContact,



        hours:

          publicHours,



        socialLinks:

          publicSocialLinks,

      },

    };

  }



  // ─────────────────────────────────────────

  // PUBLIC CONTACT

  //

  // IMPORTANT:

  //

  // We do NOT fall back to arbitrary

  // email/phone fields.

  //

  // A contact value is exposed only when:

  //

  // 1. It exists in a public-specific field

  //    such as publicEmail/publicPhone

  //

  // OR

  //

  // 2. A matching public flag is explicitly true.

  //

  // This prevents private account contact

  // information from being sent to Vapi.

  // ─────────────────────────────────────────



  private publicContact(

    item: any,

  ): Record<string, unknown> | undefined {

    if (!item) {

      return undefined;

    }



    const contact: Record<

      string,

      unknown

    > = {};



    // ───────────────────────────────────────

    // EMAIL

    // ───────────────────────────────────────



    const publicEmail =

      this.firstPublicString([

        item?.publicEmail,



        this.publicFlag(

          item,

          [

            "emailPublic",

            "showEmail",

            "isEmailPublic",

          ],

        )

          ? item?.email

          : undefined,



        this.publicFlag(

          item?.publicContact,

          [

            "emailPublic",

            "showEmail",

            "isPublic",

          ],

        )

          ? item?.publicContact?.email

          : undefined,



        this.publicFlag(

          item?.contact,

          [

            "emailPublic",

            "showEmail",

            "isPublic",

          ],

        )

          ? item?.contact?.email

          : undefined,

      ]);



    if (publicEmail) {

      contact.email =

        publicEmail;

    }



    // ───────────────────────────────────────

    // PHONE

    // ───────────────────────────────────────



    const publicPhone =

      this.firstPublicString([

        item?.publicPhone,



        this.publicFlag(

          item,

          [

            "phonePublic",

            "showPhone",

            "isPhonePublic",

          ],

        )

          ? item?.phone

          : undefined,



        this.publicFlag(

          item,

          [

            "phonePublic",

            "showPhone",

            "isPhonePublic",

          ],

        )

          ? item?.phoneNumber

          : undefined,



        this.publicFlag(

          item?.publicContact,

          [

            "phonePublic",

            "showPhone",

            "isPublic",

          ],

        )

          ? item?.publicContact?.phone

          : undefined,



        this.publicFlag(

          item?.contact,

          [

            "phonePublic",

            "showPhone",

            "isPublic",

          ],

        )

          ? item?.contact?.phone

          : undefined,

      ]);



    if (publicPhone) {

      contact.phone =

        publicPhone;

    }



    // ───────────────────────────────────────

    // WEBSITE

    //

    // Website URLs are business-facing

    // public information. Prefer explicit

    // publicWebsite when available.

    // ───────────────────────────────────────



    const website =

      this.firstPublicString([

        item?.publicWebsite,

        item?.websiteUrl,

        item?.website,

      ]);



    if (website) {

      contact.website =

        website;

    }



    // ───────────────────────────────────────

    // ADDRESS

    //

    // Do NOT expose arbitrary private

    // addresses.

    // ───────────────────────────────────────



    const publicAddress =

      this.publicAddress(item);



    if (publicAddress) {

      contact.address =

        publicAddress;

    }



    return Object.keys(

      contact,

    ).length

      ? contact

      : undefined;

  }



  // ─────────────────────────────────────────

  // PUBLIC ADDRESS

  // ─────────────────────────────────────────



  private publicAddress(

    item: any,

  ): Record<string, unknown> | undefined {

    if (!item) {

      return undefined;

    }



    /*

     * Explicit publicAddress object.

     */

    if (

      item?.publicAddress &&

      typeof item.publicAddress ===

        "object"

    ) {

      return this.sanitizeAddress(

        item.publicAddress,

      );

    }



    /*

     * Explicitly marked address as public.

     */

    if (

      this.publicFlag(

        item,

        [

          "addressPublic",

          "showAddress",

          "isAddressPublic",

        ],

      )

    ) {

      return this.sanitizeAddress({

        address:

          item?.address,



        street:

          item?.street,



        city:

          item?.city ??

          item?.location?.city,



        state:

          item?.state ??

          item?.stateProvince ??

          item?.location?.state,



        country:

          item?.country ??

          item?.location?.country,



        postalCode:

          item?.postalCode ??

          item?.zipCode,

      });

    }



    /*

     * Some schemas may keep public address

     * inside publicContact.

     */

    if (

      item?.publicContact?.address

    ) {

      return this.sanitizeAddress(

        item.publicContact.address,

      );

    }



    /*

     * Do NOT fall back to item.address.

     *

     * This is intentional.

     */

    return undefined;

  }



  // ─────────────────────────────────────────

  // SANITIZE ADDRESS

  // ─────────────────────────────────────────



  private sanitizeAddress(

    address: any,

  ): Record<string, unknown> | undefined {

    if (

      !address ||

      typeof address !== "object"

    ) {

      return undefined;

    }



    const result: Record<

      string,

      unknown

    > = {};



    const fields = [

      "address",

      "street",

      "city",

      "state",

      "stateProvince",

      "country",

      "postalCode",

      "zipCode",

    ];



    for (const field of fields) {

      const value =

        this.optionalString(

          address?.[field],

        );



      if (value) {

        result[

          field === "stateProvince"

            ? "state"

            : field === "zipCode"

              ? "postalCode"

              : field

        ] = value;

      }

    }



    return Object.keys(result)

      .length

      ? result

      : undefined;

  }



  // ─────────────────────────────────────────

  // PUBLIC HOURS

  // ─────────────────────────────────────────



  private publicHours(

    item: any,

  ): FockisShopPublicHours | undefined {

    const hours =
      item?.businessHours ??
      item?.hours;

    if (!hours) {
      return undefined;
    }

    // Simple string format.
    if (typeof hours === "string") {
      const value = this.optionalString(hours);

      return value
        ? { value }
        : undefined;
    }

    // Hours must be a structured object.
    if (
      typeof hours !== "object" ||
      Array.isArray(hours)
    ) {
      return undefined;
    }

    const source =
      hours as Record<string, unknown>;

    const result: FockisShopPublicHours = {};

    for (const [key, value] of Object.entries(source)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        result[key] = value;
        continue;
      }

      if (Array.isArray(value)) {
        result[key] = value.slice(0, 20);
        continue;
      }

      if (
        typeof value === "object" &&
        value !== null
      ) {
        result[key] = value;
      }
    }

    return Object.keys(result).length > 0
      ? result
      : undefined;
  }


  // ─────────────────────────────────────────

  // PUBLIC SOCIAL LINKS

  // ─────────────────────────────────────────



  private publicSocialLinks(

    item: any,

  ): Record<string, string> | undefined {

    const source =

      item?.socialLinks ??

      item?.social;



    if (

      !source ||

      typeof source !== "object"

    ) {

      return undefined;

    }



    const result: Record<

      string,

      string

    > = {};



    const allowed = [

      "facebook",

      "instagram",

      "twitter",

      "x",

      "youtube",

      "tiktok",

      "linkedin",

      "website",

    ];



    for (const key of allowed) {

      const value =

        this.optionalString(

          source?.[key],

        );



      if (value) {

        result[key] = value;

      }

    }



    return Object.keys(result)

      .length

      ? result

      : undefined;

  }



  // ─────────────────────────────────────────

  // PUBLIC FLAG

  // ─────────────────────────────────────────



  private publicFlag(

    item: any,

    keys: string[],

  ): boolean {

    if (

      !item ||

      typeof item !== "object"

    ) {

      return false;

    }



    return keys.some(

      (key) =>

        item?.[key] === true,

    );

  }



  // ─────────────────────────────────────────

  // FIRST PUBLIC STRING

  // ─────────────────────────────────────────



  private firstPublicString(

    values: unknown[],

  ): string | undefined {

    for (const value of values) {

      const result =

        this.optionalString(

          value,

        );



      if (result) {

        return result;

      }

    }



    return undefined;

  }



  // ─────────────────────────────────────────

  // PUBLIC STRING ARRAY

  // ─────────────────────────────────────────



  private publicStringArray(

    value: unknown,

  ): string[] | undefined {

    if (

      !Array.isArray(value)

    ) {

      return undefined;

    }



    const values =

      value

        .map((item) =>

          this.optionalString(

            item,

          ),

        )

        .filter(

          (

            item,

          ): item is string =>

            Boolean(item),

        );



    return values.length

      ? values.slice(0, 50)

      : undefined;

  }



  // ─────────────────────────────────────────

  // PUBLIC DISPLAY LOCATIONS

  // ─────────────────────────────────────────



  private publicDisplayLocations(

    value: unknown,

  ): string[] | undefined {

    return this.publicStringArray(

      value,

    );

  }



  // ─────────────────────────────────────────

  // RESULT

  // ─────────────────────────────────────────



  private result(

    tool: FockisShopDiscoveryQuery["tool"],

    query: string,

    results: FockisShopDiscoveryResultItem[],

  ): FockisShopDiscoveryResult {

    return {

      tool,



      query,



      count:

        results.length,



      results,



      searchedLiveDatabase:

        true,

    };

  }



  // ─────────────────────────────────────────

  // MONGODB COLLECTION

  // ─────────────────────────────────────────



  private collection(

    name: string,

  ) {

    const db =

      this.connection.db;



    if (!db) {

      throw new Error(

        "MongoDB database connection is not ready.",

      );

    }



    return db.collection(name);

  }



  // ─────────────────────────────────────────

  // TEXT CONDITIONS

  // ─────────────────────────────────────────



  private textConditions(

    query: string,

    fields: string[],

  ) {

    if (!query) {

      return [];

    }



    const regex = {

      $regex:

        this.escape(query),



      $options: "i",

    };



    return fields.map(

      (field) => ({

        [field]: regex,

      }),

    );

  }



  // ─────────────────────────────────────────

  // LOCATION FILTER

  // ─────────────────────────────────────────



  private addLocation(

    filter: Record<string, any>,

    request: FockisShopDiscoveryQuery,

  ) {

    if (request.city) {

      filter.city = {

        $regex: this.escape(

          request.city,

        ),

        $options: "i",

      };

    }



    if (request.state) {

      filter.state = {

        $regex: this.escape(

          request.state,

        ),

        $options: "i",

      };

    }



    if (request.country) {

      filter.country = {

        $regex: this.escape(

          request.country,

        ),

        $options: "i",

      };

    }

  }



  // ─────────────────────────────────────────

  // LOCATION

  //

  // This is marketplace/business

  // location information, not a private

  // person's home address.

  // ─────────────────────────────────────────



  private location(

    item: any,

  ) {

    const city =

      this.optionalString(

        item?.city ??

          item?.location?.city,

      );



    const state =

      this.optionalString(

        item?.state ??

          item?.stateProvince ??

          item?.location?.state,

      );



    const country =

      this.optionalString(

        item?.country ??

          item?.location?.country,

      );



    const result: Record<

      string,

      string

    > = {};



    if (city) {

      result.city = city;

    }



    if (state) {

      result.state = state;

    }



    if (country) {

      result.country = country;

    }



    return result;

  }



  // ─────────────────────────────────────────

  // FIRST IMAGE

  // ─────────────────────────────────────────



  private firstImage(

    images: unknown,

  ): string | undefined {

    if (

      !Array.isArray(images)

    ) {

      return undefined;

    }



    for (

      const image of images

    ) {

      if (

        typeof image ===

          "string" &&

        image.trim()

      ) {

        return image.trim();

      }



      if (

        image &&

        typeof image ===

          "object"

      ) {

        const value =

          image as Record<

            string,

            unknown

          >;



        const url =

          typeof value.url ===

          "string"

            ? value.url

            : typeof value.src ===

                "string"

              ? value.src

              : "";



        if (url.trim()) {

          return url.trim();

        }

      }

    }



    return undefined;

  }



  // ─────────────────────────────────────────

  // NUMBER

  // ─────────────────────────────────────────



  private numberOrUndefined(

    value: unknown,

  ) {

    if (

      value === undefined ||

      value === null ||

      value === ""

    ) {

      return undefined;

    }



    const number =

      Number(value);



    return Number.isFinite(

      number,

    )

      ? number

      : undefined;

  }



  // ─────────────────────────────────────────

  // OPTIONAL STRING

  // ─────────────────────────────────────────



  private optionalString(

    value: unknown,

  ) {

    if (

      typeof value !==

      "string"

    ) {

      return undefined;

    }



    const trimmed =

      value.trim();



    return trimmed

      ? trimmed.slice(

          0,

          1000,

        )

      : undefined;

  }



  // ─────────────────────────────────────────

  // ID

  // ─────────────────────────────────────────



  private id(

    value: unknown,

  ) {

    if (

      value === undefined ||

      value === null

    ) {

      return "";

    }



    return String(value);

  }



  // ─────────────────────────────────────────

  // OBJECT ID CHECK

  // ─────────────────────────────────────────



  private isObjectId(

    value: string,

  ) {

    return /^[a-f\d]{24}$/i.test(

      value,

    );

  }



  // ─────────────────────────────────────────

  // OBJECT ID

  // ─────────────────────────────────────────



  private toObjectId(

    value: string,

  ) {

    return new Types.ObjectId(

      value,

    );

  }



  // ─────────────────────────────────────────

  // ESCAPE REGEX

  // ─────────────────────────────────────────



  private escape(

    value: string,

  ) {

    return value

      .replace(

        /[.*+?^${}()|[\]\\]/g,

        "\\$&",

      )

      .slice(

        0,

        200,

      );

  }



  // ─────────────────────────────────────────

  // CLEAN STRING

  // ─────────────────────────────────────────



  private clean(

    value?: string,

  ) {

    return String(

      value ?? "",

    )

      .trim()

      .slice(

        0,

        300,

      );

  }



  // ─────────────────────────────────────────

  // NORMALIZE LIMIT

  // ─────────────────────────────────────────



  private normalizeLimit(

    value?: number,

  ) {

    if (

      typeof value !==

        "number" ||

      !Number.isFinite(

        value,

      )

    ) {

      return 8;

    }



    return Math.min(

      Math.max(

        Math.floor(value),

        1,

      ),

      this.maxLimit,

    );

  }

}