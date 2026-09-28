import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomInt } from "node:crypto";
import {
  AddressStatus,
  FockisAddress,
  FockisAddressDocument,
} from "./schemas/fockis-address.schema";
import {
  AddressRequest,
  AddressRequestDocument,
  AddressRequestStatus,
} from "./schemas/address-request.schema";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { CreateUnitDto } from "./dto/create-unit.dto";

type CurrentUser = { id?: string; userId?: string; _id?: string };

@Injectable()
export class MapService {
  constructor(
    @InjectModel(FockisAddress.name)
    private readonly addressModel: Model<FockisAddressDocument>,
    @InjectModel(AddressRequest.name)
    private readonly requestModel: Model<AddressRequestDocument>,
  ) {}

  private userId(user: CurrentUser): Types.ObjectId {
    const raw = user.id ?? user.userId ?? user._id;
    if (!raw || !Types.ObjectId.isValid(raw)) {
      throw new BadRequestException("Authenticated user ID is invalid.");
    }
    return new Types.ObjectId(raw);
  }

  private async nextAddressId(countryCode: string, city?: string) {
    const normalizedCountry = countryCode.toUpperCase();
    const cityCode = (city ?? "GLOBAL")
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, "X");

    for (let attempt = 0; attempt < 20; attempt++) {
      const serial = randomInt(1, 999999).toString().padStart(6, "0");
      const candidate = `FK-${normalizedCountry}-${cityCode}-${serial}`;
      if (!(await this.addressModel.exists({ fockisAddressId: candidate }))) {
        return candidate;
      }
    }
    throw new BadRequestException("Could not allocate a unique Fockis Address ID.");
  }

  list(countryCode?: string, q?: string) {
    const filter: Record<string, unknown> = { status: AddressStatus.ACTIVE };
    if (countryCode) filter.countryCode = countryCode.toUpperCase();

    if (q?.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { fockisAddressId: new RegExp(escaped, "i") },
        { addressLine: new RegExp(escaped, "i") },
        { neighborhood: new RegExp(escaped, "i") },
        { communeOrCity: new RegExp(escaped, "i") },
        { buildingName: new RegExp(escaped, "i") },
      ];
    }

    return this.addressModel.find(filter).sort({ updatedAt: -1 }).limit(500).lean();
  }

  async get(id: string) {
    const address = await this.addressModel.findById(id).lean();
    if (!address) throw new NotFoundException("Fockis address not found.");
    return address;
  }

  async create(dto: CreateAddressDto, user: CurrentUser) {
    const creator = this.userId(user);
    const fockisAddressId = await this.nextAddressId(
      dto.countryCode,
      dto.communeOrCity,
    );

    const created = await this.addressModel.create({
      ...dto,
      countryCode: dto.countryCode.toUpperCase(),
      fockisAddressId,
      createdBy: creator,
      managers: [creator],
      status: AddressStatus.ACTIVE,
    });

    return created.toObject();
  }

  async update(id: string, dto: UpdateAddressDto) {
    const address = await this.addressModel.findByIdAndUpdate(
      id,
      { $set: { ...dto, ...(dto.countryCode ? { countryCode: dto.countryCode.toUpperCase() } : {}) } },
      { new: true, runValidators: true },
    ).lean();

    if (!address) throw new NotFoundException("Fockis address not found.");
    return address;
  }

  async deactivate(id: string) {
    const address = await this.addressModel.findByIdAndUpdate(
      id,
      { $set: { status: AddressStatus.INACTIVE } },
      { new: true },
    ).lean();

    if (!address) throw new NotFoundException("Fockis address not found.");
    return address;
  }

  async addUnit(id: string, dto: CreateUnitDto) {
    const address = await this.addressModel.findById(id);
    if (!address) throw new NotFoundException("Fockis address not found.");

    const duplicate = address.units.some(
      (unit) => unit.unitNumber.toLowerCase() === dto.unitNumber.toLowerCase(),
    );
    if (duplicate) throw new BadRequestException("That unit number already exists.");

    address.units.push({
      unitNumber: dto.unitNumber.trim(),
      floor: dto.floor?.trim(),
      unitType: dto.unitType ?? "APARTMENT",
      status: "ACTIVE",
    } as never);

    await address.save();
    return address.toObject();
  }

  async createRequest(dto: { addressId: string; unitId: string; note?: string }, user: CurrentUser) {
    const requesterId = this.userId(user);

    const address = await this.addressModel.findOne({
      _id: dto.addressId,
      status: AddressStatus.ACTIVE,
    });

    if (!address) throw new NotFoundException("Fockis address not found.");

    const unit = address.units.id(dto.unitId);
    if (!unit || unit.status !== "ACTIVE") {
      throw new NotFoundException("Fockis unit not found.");
    }

    const existing = await this.requestModel.findOne({
      addressId: address._id,
      unitId: unit._id,
      requesterId,
      status: AddressRequestStatus.PENDING,
    });

    if (existing) throw new BadRequestException("You already have a pending request.");

    return this.requestModel.create({
      addressId: address._id,
      unitId: unit._id,
      requesterId,
      note: dto.note,
      status: AddressRequestStatus.PENDING,
    });
  }

  myRequests(user: CurrentUser) {
    return this.requestModel
      .find({ requesterId: this.userId(user) })
      .sort({ createdAt: -1 })
      .lean();
  }
}
