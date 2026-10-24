import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

// Fockis Shop order model is injected by its registered Mongoose model name.
// Keeping these lightweight types local avoids importing the retired Marketplace module.
type OrderDocument = any;

const Order = { name: "Order" } as const;

const OrderStatus = {
  PAID: "paid",
  PROCESSING: "processing",
  READY_TO_SHIP: "ready_to_ship",
  SHIPPED: "shipped",
} as const;

const PaymentStatus = {
  PAID: "paid",
} as const;

const ShipmentStatus = {
  SHIPPED: "shipped",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;
import {
  Store,
  StoreDocument,
} from "../../../stores/schemas/store.schema";
import { CarrierService } from "./carrier.service";
import { PayoutsService } from "../../../payouts/payouts.service";

type ParcelInput = {
  weight: number;
  massUnit: "lb" | "oz" | "kg" | "g";
  length: number;
  width: number;
  height: number;
  distanceUnit: "in" | "cm" | "ft" | "mm" | "m";
};

type ShippoRate = {
  object_id: string;
  provider?: string;
  provider_image_75?: string;
  servicelevel?: {
    name?: string;
    token?: string;
  };
  amount?: string;
  currency?: string;
  estimated_days?: number | null;
  duration_terms?: string;
};

type ShippoShipmentResponse = {
  object_id?: string;
  rates?: ShippoRate[];
  detail?: string;
  messages?: unknown[];
};

type ShippoCarrierAccount = {
  object_id?: string;
  carrier?: string;
  active?: boolean;
  test?: boolean;
};

type ShippoCarrierAccountsResponse = {
  results?: ShippoCarrierAccount[];
  next?: string | null;
};

type ShippoTransactionResponse = {
  object_id?: string;
  status?: string;
  label_url?: string;
  tracking_number?: string;
  tracking_url_provider?: string;
  messages?: Array<{
    text?: string;
    code?: string;
  }>;
};

@Injectable()
export class ShippingService {
  constructor(
    @InjectModel("Order")
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,

    private readonly carrierService: CarrierService,

    // Optional so shipping keeps working even if PayoutsModule is not imported.
    @Optional()
    private readonly payoutsService?: PayoutsService,
  ) {}

  /**
   * Create live Shippo checkout rates before an order exists.
   * The caller supplies a store ID, delivery address, and actual parcel data.
   * No order or shipment is created by this method.
   */
  async getCheckoutShippoRates(
    storeId: string,
    destination: {
      fullName: string;
      street: string;
      apartment?: string;
      neighborhood?: string;
      houseOrApartmentNumber?: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      email: string;
      phone?: string;
    },
    parcel: ParcelInput,
  ) {
    if (!Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException("A valid store ID is required.");
    }

    this.validateParcel(parcel);

    if (!destination || typeof destination !== "object") {
      throw new BadRequestException("A complete delivery address is required.");
    }

    const store = await this.storeModel.findById(storeId).exec();
    if (!store) {
      throw new NotFoundException("The seller's store was not found.");
    }

    const addressFrom = this.buildStoreAddress(store);
    const street1 = [
      destination.houseOrApartmentNumber,
      destination.street,
      destination.neighborhood,
    ]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" ")
      .trim();

    const requiredAddressFields = [
      destination.fullName,
      street1,
      destination.city,
      destination.state,
      destination.zipCode,
      destination.country,
      destination.email,
    ];

    if (
      requiredAddressFields.some(
        (value) => typeof value !== "string" || !value.trim(),
      )
    ) {
      throw new BadRequestException(
        "The delivery address must include recipient name, street, city, state, postal code, country, and email.",
      );
    }

    // UPS and FedEx commonly reject invalid phone numbers (e.g. "3"),
    // which silently removes their rates while USPS still returns rates.
    const recipientPhone = this.normalizePhone(destination.phone);
    if (destination.phone?.trim() && !recipientPhone) {
      console.warn(
        "[FOCKIS SHIPPING] Recipient phone is invalid and was not sent to Shippo. UPS/FedEx rates may be unavailable.",
      );
    }

    const addressTo = {
      name: destination.fullName.trim(),
      street1,
      ...(destination.apartment?.trim()
        ? { street2: destination.apartment.trim() }
        : {}),
      city: destination.city.trim(),
      state: destination.state.trim(),
      zip: destination.zipCode.trim(),
      country: this.countryCode(destination.country),
      email: destination.email.trim(),
      ...(recipientPhone ? { phone: recipientPhone } : {}),
    };

    // Diagnose which carrier accounts this token can access.
    // Shippo will select all active accounts because carrier_accounts is omitted.
    await this.logShippoCarrierAccounts();

    const result = await this.shippoRequest<ShippoShipmentResponse>(
      "/shipments/",
      {
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [
          {
            weight: String(parcel.weight),
            mass_unit: parcel.massUnit,
            length: String(parcel.length),
            width: String(parcel.width),
            height: String(parcel.height),
            distance_unit: parcel.distanceUnit,
          },
        ],
        async: false,
      },
    );

    // Diagnostic logging: shows which carrier services Shippo actually returned.
    // Do not log customer addresses, authentication tokens, or payment information.
    console.log(
      "[FOCKIS SHIPPING] Shippo checkout rates:",
      JSON.stringify(
        (result.rates ?? []).map((rate) => ({
          carrier: rate.provider ?? "Unknown carrier",
          service: rate.servicelevel?.name ?? "Unknown service",
          amount: rate.amount ?? null,
          currency: rate.currency ?? "USD",
          estimatedDays: rate.estimated_days ?? null,
        })),
        null,
        2,
      ),
    );

    // Per-carrier errors: explains why carriers such as UPS or FedEx
    // returned no rates even though their accounts are active.
    this.logShippoMessages(result.messages);

    if (!result.object_id) {
      throw new ServiceUnavailableException(
        "Shippo did not return a shipment ID for checkout rates.",
      );
    }

    // Keep every valid rate returned by Shippo. Do not restrict this list
    // to USPS or to a single service level; the available options depend on
    // the seller's enabled carrier accounts and the shipment details.
    const rates = (result.rates ?? [])
      .filter(
        (rate) =>
          typeof rate.object_id === "string" &&
          rate.object_id.trim().length > 0 &&
          rate.amount !== undefined &&
          Number.isFinite(Number(rate.amount)) &&
          Number(rate.amount) >= 0,
      )
      .map((rate) => ({
        rateId: rate.object_id,
        carrier: rate.provider ?? "Carrier",
        service: rate.servicelevel?.name ?? "Shipping",
        serviceLevelToken: rate.servicelevel?.token ?? "",
        amount: Number(rate.amount),
        currency: rate.currency ?? "USD",
        estimatedDays: rate.estimated_days ?? null,
        deliveryTerms: rate.duration_terms ?? "",
        carrierImage: rate.provider_image_75 ?? "",
      }));

    if (!rates.length) {
      const shippoMessages = this.formatShippoMessages(result.messages);

      throw new ServiceUnavailableException({
        message:
          "Shippo created the shipment but returned no usable shipping rates. Verify the seller's complete origin address, destination address, package dimensions and weight, and enabled carrier accounts.",
        ...(shippoMessages ? { details: shippoMessages } : {}),
      });
    }

    return {
      storeId,
      shippoShipmentId: result.object_id,
      rates,
    };
  }

  /**
   * Get real Shippo rates for one embedded order shipment.
   * Sender and recipient addresses are read from database records.
   */
  async getShippoRates(
    sellerId: string,
    orderId: string,
    shipmentId: string,
    parcel: ParcelInput,
  ) {
    this.validateIds(sellerId, orderId, shipmentId);
    this.validateParcel(parcel);

    const { order, shipment } = await this.getAuthorizedShipment(
      sellerId,
      orderId,
      shipmentId,
    );

    if (
      order.paymentStatus !== PaymentStatus.PAID &&
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.PROCESSING &&
      order.status !== OrderStatus.READY_TO_SHIP
    ) {
      throw new BadRequestException(
        "The order must be paid before shipping rates can be requested.",
      );
    }

    if (shipment.labelUrl || shipment.shippoTransactionId) {
      throw new ConflictException(
        "A shipping label has already been purchased for this shipment.",
      );
    }

    const store = await this.storeModel.findById(shipment.storeId).exec();

    if (!store) {
      throw new NotFoundException("The seller's store was not found.");
    }

    const addressFrom = this.buildStoreAddress(store);
    const addressTo = this.buildRecipientAddress(order);

    // Diagnose carrier accounts; let Shippo select all active accounts by default.
    await this.logShippoCarrierAccounts();

    const result = await this.shippoRequest<ShippoShipmentResponse>(
      "/shipments/",
      {
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [
          {
            weight: String(parcel.weight),
            mass_unit: parcel.massUnit,
            length: String(parcel.length),
            width: String(parcel.width),
            height: String(parcel.height),
            distance_unit: parcel.distanceUnit,
          },
        ],
        async: false,
      },
    );

    this.logShippoMessages(result.messages);

    if (!result.object_id) {
      throw new ServiceUnavailableException(
        "Shippo did not return a shipment ID.",
      );
    }

    const rates = (result.rates ?? [])
      .filter((rate) => rate.object_id && rate.amount !== undefined)
      .map((rate) => ({
        objectId: rate.object_id,
        provider: rate.provider ?? "",
        serviceLevelName: rate.servicelevel?.name ?? "",
        serviceLevelToken: rate.servicelevel?.token ?? "",
        amount: Number(rate.amount),
        currency: rate.currency ?? order.currency ?? "USD",
        estimatedDays: rate.estimated_days ?? null,
        retrievedAt: new Date(),
      }));

    if (rates.some((rate) => !Number.isFinite(rate.amount) || rate.amount < 0)) {
      throw new ServiceUnavailableException(
        "Shippo returned an invalid shipping rate.",
      );
    }

    shipment.shippoShipmentObjectId = result.object_id;
    shipment.shippoRates = rates as typeof shipment.shippoRates;
    shipment.shippoRatesRetrievedAt = new Date();

    await order.save();

    return {
      orderId,
      shipmentId,
      shippoShipmentId: result.object_id,
      rates: rates.map((rate) => ({
        rateId: rate.objectId,
        carrier: rate.provider,
        service: rate.serviceLevelName,
        amount: rate.amount,
        currency: rate.currency,
        estimatedDays: rate.estimatedDays,
      })),
    };
  }

  /**
   * Purchase a real label using a rate previously saved for this shipment.
   */
  async purchaseShippoLabel(
    sellerId: string,
    orderId: string,
    shipmentId: string,
    rateId: string,
  ) {
    this.validateIds(sellerId, orderId, shipmentId);

    if (typeof rateId !== "string" || !rateId.trim()) {
      throw new BadRequestException("A valid Shippo rate ID is required.");
    }

    const { order, shipment } = await this.getAuthorizedShipment(
      sellerId,
      orderId,
      shipmentId,
    );

    if (
      order.paymentStatus !== PaymentStatus.PAID &&
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.PROCESSING &&
      order.status !== OrderStatus.READY_TO_SHIP
    ) {
      throw new BadRequestException(
        "The order must be paid before a shipping label can be purchased.",
      );
    }

    if (shipment.labelUrl || shipment.shippoTransactionId) {
      throw new ConflictException(
        "A label has already been purchased for this shipment.",
      );
    }

    const selectedRate = (shipment.shippoRates ?? []).find(
      (rate) => rate.objectId === rateId.trim(),
    );

    if (!selectedRate || !shipment.shippoShipmentObjectId) {
      throw new BadRequestException(
        "That rate was not saved for this shipment. Request current rates and select one of the returned options.",
      );
    }

    const transaction = await this.shippoRequest<ShippoTransactionResponse>(
      "/transactions/",
      {
        rate: selectedRate.objectId,
        label_file_type: "PDF",
        async: false,
      },
    );

    if (
      transaction.status !== "SUCCESS" ||
      !transaction.label_url ||
      !transaction.tracking_number ||
      !transaction.object_id
    ) {
      throw new ServiceUnavailableException({
        message: "Shippo did not complete the label purchase.",
        details: transaction.messages ?? [],
      });
    }

    // Persist the confirmed purchase before reporting success.
    shipment.shippoTransactionId = transaction.object_id;
    shipment.shippoTransactionStatus = transaction.status;
    shipment.shippoLabelFileType = "PDF";
    shipment.shippoSelectedRateId = selectedRate.objectId;
    shipment.shippoSelectedProvider = selectedRate.provider;
    shipment.shippoSelectedService = selectedRate.serviceLevelName;
    shipment.shippoLabelAmount = selectedRate.amount;
    shipment.shippoLabelCurrency = selectedRate.currency;
    shipment.labelUrl = transaction.label_url;
    shipment.labelPurchasedAt = new Date();
    shipment.carrier = selectedRate.provider;
    shipment.trackingNumber = transaction.tracking_number;
    shipment.trackingUrl = transaction.tracking_url_provider ?? "";
    shipment.status = ShipmentStatus.SHIPPED;
    shipment.shippedAt = new Date();

    const remainingUnshipped = (order.shipments ?? []).some(
      (item) =>
        item !== shipment &&
        item.status !== ShipmentStatus.SHIPPED &&
        item.status !== ShipmentStatus.IN_TRANSIT &&
        item.status !== ShipmentStatus.OUT_FOR_DELIVERY &&
        item.status !== ShipmentStatus.DELIVERED &&
        item.status !== ShipmentStatus.CANCELLED,
    );

    if (!remainingUnshipped) {
      order.status = OrderStatus.SHIPPED;
      order.shippedAt = new Date();
    }

    // Populate legacy order-level fields only if they are empty.
    if (!order.trackingNumber) {
      order.trackingNumber = transaction.tracking_number;
    }
    if (!order.carrier) {
      order.carrier = selectedRate.provider;
    }

    await order.save();

    // Pay the seller now that the label is bought.
    // A payout problem never fails the label purchase; it is logged and
    // retried automatically when the seller finishes Stripe onboarding.
    let payout: unknown = { status: "payouts_not_configured" };
    if (this.payoutsService) {
      try {
        payout = await this.payoutsService.releaseShipmentPayout(
          orderId,
          shipmentId,
        );
      } catch (error) {
        console.error(
          "[FOCKIS PAYOUTS] Seller payout failed after label purchase:",
          error instanceof Error ? error.message : "Unknown error",
        );
        payout = { status: "failed" };
      }
    }

    return {
      success: true,
      payout,
      orderId,
      shipmentId,
      transactionId: transaction.object_id,
      carrier: selectedRate.provider,
      service: selectedRate.serviceLevelName,
      amount: selectedRate.amount,
      currency: selectedRate.currency,
      labelUrl: transaction.label_url,
      trackingNumber: transaction.tracking_number,
      trackingUrl: transaction.tracking_url_provider ?? "",
      status: transaction.status,
    };
  }

  /**
   * Existing checkout estimate. This remains an estimate, not a live quote.
   */
  async calculateShipping(country: string, weight = 1) {
    if (!country?.trim()) {
      throw new BadRequestException("Shipping country is required.");
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      throw new BadRequestException(
        "Package weight must be a positive number.",
      );
    }

    const normalizedCountry = country.trim().toLowerCase();

    const baseRates: Record<string, number> = {
      usa: 5,
      us: 5,
      "united states": 5,
      "united states of america": 5,
      canada: 7,
      uk: 6,
      "united kingdom": 6,
      france: 6,
      default: 12,
    };

    const domestic = [
      "usa",
      "us",
      "united states",
      "united states of america",
    ].includes(normalizedCountry);

    const carrier = this.carrierService.selectCarrier({
      country: normalizedCountry,
      weight,
    });

    return {
      country,
      weight,
      price: Number(
        ((baseRates[normalizedCountry] ?? baseRates.default) + weight * 1.2)
          .toFixed(2),
      ),
      eta: domestic ? "2-4 days" : "5-10 days",
      carrier,
    };
  }

  private async getAuthorizedShipment(
    sellerId: string,
    orderId: string,
    shipmentId: string,
  ) {
    const order = await this.orderModel.findById(orderId).exec();

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    const shipment = (order.shipments ?? []).find(
      (item) =>
        String(
          (item as typeof item & { _id?: Types.ObjectId })._id ?? "",
        ) === shipmentId,
    );

    if (!shipment) {
      throw new NotFoundException(
        "The shipment was not found in this order.",
      );
    }

    if (String(shipment.seller) !== sellerId) {
      throw new ForbiddenException(
        "You are not authorized to fulfill this seller shipment.",
      );
    }

    const store = await this.storeModel.findById(shipment.storeId).exec();

    if (!store) {
      throw new NotFoundException("The seller's store was not found.");
    }

    const ownsStore =
      String(store.ownerId) === sellerId ||
      String(store.sellerId ?? "") === sellerId;

    if (!ownsStore) {
      throw new ForbiddenException(
        "You do not own the store associated with this shipment.",
      );
    }

    return { order, shipment };
  }

  private buildStoreAddress(store: StoreDocument) {
    const data = store as unknown as Record<string, unknown>;
    const address = this.firstString(
      data.address,
      data.street,
      data.streetAddress,
      data.businessAddress,
    );
    const city = this.firstString(data.city);
    const state = this.firstString(data.state, data.province);
    const zip = this.firstString(data.zipCode, data.postalCode);
    const country = this.firstString(data.countryCode, data.country);
    const name = this.firstString(data.name, data.businessName);
    const email = this.firstString(data.email);
    const phone = this.normalizePhone(
      this.firstString(data.phone, data.phoneNumber, data.businessPhone),
    );

    const missingFields = [
      ["store name", name],
      ["street address", address],
      ["city", city],
      ["state/province", state],
      ["postal code", zip],
      ["country/country code", country],
      ["store email", email],
    ]
      .filter(([, value]) => !value)
      .map(([label]) => label);

    if (missingFields.length) {
      throw new BadRequestException(
        `Complete the seller store's shipping details before requesting live rates or purchasing labels. Missing: ${missingFields.join(", ")}.`,
      );
    }

    if (!phone) {
      // UPS and FedEx usually require a shipper phone number.
      console.warn(
        "[FOCKIS SHIPPING] Store has no valid phone number. UPS/FedEx may not return rates until the store phone is set.",
      );
    }

    return {
      name,
      street1: address,
      city,
      state,
      zip,
      country: this.countryCode(country),
      email,
      ...(phone ? { phone } : {}),
    };
  }

  private buildRecipientAddress(order: OrderDocument) {
    const address = order.shippingAddress;

    const street1 = [
      address.houseOrApartmentNumber,
      address.street,
      address.neighborhood,
    ]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" ")
      .trim();

    const street2 = address.apartment?.trim() || "";

    if (
      !address.fullName?.trim() ||
      !street1 ||
      !address.city?.trim() ||
      !address.state?.trim() ||
      !address.zipCode?.trim() ||
      !address.country?.trim() ||
      !(address.email || order.customerEmail)?.trim()
    ) {
      throw new BadRequestException(
        "The customer's shipping address is incomplete. Ask the customer to update it before purchasing a label.",
      );
    }

    const phone = this.normalizePhone(address.phone);

    return {
      name: address.fullName.trim(),
      street1,
      ...(street2 ? { street2 } : {}),
      city: address.city.trim(),
      state: address.state.trim(),
      zip: address.zipCode.trim(),
      country: this.countryCode(address.country),
      email: (address.email || order.customerEmail).trim(),
      ...(phone ? { phone } : {}),
    };
  }

  /**
   * Returns a digits-only phone number, or undefined if it is not usable.
   * US numbers with a leading country code "1" are reduced to 10 digits.
   */
  private normalizePhone(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;

    let digits = value.replace(/\D/g, "");

    if (digits.length === 11 && digits.startsWith("1")) {
      digits = digits.slice(1);
    }

    if (digits.length < 10 || digits.length > 15) {
      return undefined;
    }

    return digits;
  }

  private formatShippoMessages(messages: unknown): string {
    if (!Array.isArray(messages)) return "";

    return messages
      .map((message) => {
        if (typeof message === "string") return message;
        if (message && typeof message === "object") {
          const record = message as Record<string, unknown>;
          const source =
            typeof record.source === "string" ? `${record.source}: ` : "";
          const text = [record.text, record.message, record.code].find(
            (value) => typeof value === "string" && value.trim(),
          );
          return typeof text === "string" ? `${source}${text}` : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("; ");
  }

  private logShippoMessages(messages: unknown): void {
    console.warn(
      "[FOCKIS SHIPPING] Shippo carrier messages:",
      JSON.stringify(Array.isArray(messages) ? messages : [], null, 2),
    );
  }

  private countryCode(value: string): string {
    const normalized = value.trim().toUpperCase();

    const aliases: Record<string, string> = {
      USA: "US",
      "UNITED STATES": "US",
      "UNITED STATES OF AMERICA": "US",
      UK: "GB",
      "UNITED KINGDOM": "GB",
    };

    const code = aliases[normalized] ?? normalized;

    if (!/^[A-Z]{2}$/.test(code)) {
      throw new BadRequestException(
        `Country "${value}" must be a two-letter ISO country code.`,
      );
    }

    return code;
  }

  private validateIds(
    sellerId: string,
    orderId: string,
    shipmentId: string,
  ) {
    if (
      !Types.ObjectId.isValid(sellerId) ||
      !Types.ObjectId.isValid(orderId) ||
      !Types.ObjectId.isValid(shipmentId)
    ) {
      throw new BadRequestException(
        "Valid seller, order, and shipment IDs are required.",
      );
    }
  }

  private validateParcel(parcel: ParcelInput) {
    if (!parcel || typeof parcel !== "object") {
      throw new BadRequestException(
        "Package weight and dimensions are required.",
      );
    }

    for (const [key, value] of Object.entries({
      weight: parcel.weight,
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,
    })) {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        throw new BadRequestException(
          `Package ${key} must be a positive number.`,
        );
      }
    }

    if (!["lb", "oz", "kg", "g"].includes(parcel.massUnit)) {
      throw new BadRequestException("Unsupported package weight unit.");
    }

    if (!["in", "cm", "ft", "mm", "m"].includes(parcel.distanceUnit)) {
      throw new BadRequestException("Unsupported package dimension unit.");
    }
  }

  private firstString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  }

  /**
   * Log carrier accounts visible to this token for diagnosis.
   *
   * Do not pass carrier_accounts to the shipment request: Shippo's documented
   * default is to rate against every active carrier account for this token.
   * Explicitly forwarding a locally assembled list can unintentionally narrow
   * the carrier selection if the account lookup is incomplete or stale.
   */
  private async logShippoCarrierAccounts(): Promise<void> {
    const token = process.env.SHIPPO_API_TOKEN?.trim();

    if (!token) {
      throw new ServiceUnavailableException(
        "Shippo is not configured. Set SHIPPO_API_TOKEN in apps/api/.env.",
      );
    }

    try {
      const response = await fetch(
        "https://api.goshippo.com/carrier_accounts/?results=100",
        {
          method: "GET",
          headers: {
            Authorization: `ShippoToken ${token}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) {
        console.error(
          `[FOCKIS SHIPPING] Carrier-account lookup failed (HTTP ${response.status}); shipment request will use Shippo's default active-account selection.`,
        );
        return;
      }

      const body = (await response.json()) as ShippoCarrierAccountsResponse;
      const accounts = Array.isArray(body.results) ? body.results : [];

      console.log(
        "[FOCKIS SHIPPING] Carrier accounts visible to SHIPPO_API_TOKEN:",
        JSON.stringify(
          accounts.map((account) => ({
            carrier: account.carrier ?? "unknown",
            active: account.active ?? "not returned",
            test: account.test ?? "not returned",
            hasObjectId: Boolean(account.object_id),
          })),
          null,
          2,
        ),
      );

      if (body.next) {
        console.warn(
          "[FOCKIS SHIPPING] Shippo returned another page of carrier accounts. The shipment request still uses Shippo's default active-account selection.",
        );
      }
    } catch (error) {
      console.error(
        "[FOCKIS SHIPPING] Carrier-account lookup failed; shipment request will use Shippo's default active-account selection.",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  private async shippoRequest<T>(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const token = process.env.SHIPPO_API_TOKEN?.trim();

    if (!token) {
      throw new ServiceUnavailableException(
        "Shippo is not configured. Set SHIPPO_API_TOKEN in apps/api/.env.",
      );
    }

    let response: Response;

    try {
      response = await fetch(`https://api.goshippo.com${path}`, {
        method: "POST",
        headers: {
          Authorization: `ShippoToken ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Could not connect to Shippo. Please try again.",
      );
    }

    let body: Record<string, unknown>;

    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException(
        "Shippo returned an invalid response.",
      );
    }

    if (!response.ok) {
      const detail =
        typeof body.detail === "string"
          ? body.detail
          : Array.isArray(body.messages)
            ? body.messages
            : undefined;

      if (response.status === 400 || response.status === 422) {
        throw new BadRequestException({
          message: "Shippo rejected the request. Check the address and parcel details.",
          details: detail,
        });
      }

      if (response.status === 401 || response.status === 403) {
        throw new ServiceUnavailableException(
          "Shippo authentication failed. Check SHIPPO_API_TOKEN.",
        );
      }

      throw new ServiceUnavailableException({
        message: "Shippo could not process the request.",
        statusCode: response.status,
        details: detail,
      });
    }

    return body as T;
  }
}
