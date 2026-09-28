import {
BadRequestException,
Injectable,
NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
Model,
Types,
} from "mongoose";

import { randomInt } from "node:crypto";

import {
AddressStatus,
AddressUnit,
FockisAddress,
FockisAddressDocument,
UnitStatus,
} from "./schemas/fockis-address.schema";

import {
AddressRequest,
AddressRequestDocument,
AddressRequestStatus,
} from "./schemas/address-request.schema";

import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";

interface CurrentUser {
id?: string;
userId?: string;
sub?: string;
role?: string;
permissions?: string[];
isSuperAdmin?: boolean;
}

type AddressUnitWithId = AddressUnit & {
_id: Types.ObjectId;
};

@Injectable()
export class MapService {
constructor(
@InjectModel(FockisAddress.name)
private readonly addressModel: Model<FockisAddressDocument>,

@InjectModel(AddressRequest.name)
private readonly requestModel: Model<AddressRequestDocument>,


) {}

private userId(
user: CurrentUser,
): Types.ObjectId {
const raw =
user.id ??
user.userId ??
user.sub;
if (
  !raw ||
  !Types.ObjectId.isValid(raw)
) {
  throw new BadRequestException(
    "Authenticated user ID is invalid.",
  );
}

return new Types.ObjectId(raw);
}

private cityCode(
city?: string,
): string {
const normalized =
String(city ?? "GLOBAL")
.replace(/[^A-Za-z]/g, "")
.toUpperCase();
return normalized
  .slice(0, 3)
  .padEnd(3, "X");
}

private async nextAddressId(
countryCode: string,
city?: string,
): Promise<string> {
const normalizedCountry =
countryCode
.trim()
.toUpperCase();
const normalizedCity =
  this.cityCode(city);

for (
  let attempt = 0;
  attempt < 50;
  attempt++
) {
  const serial =
    randomInt(
      1,
      1_000_000,
    )
      .toString()
      .padStart(6, "0");

  const candidate =
    `FK-${normalizedCountry}-${normalizedCity}-${serial}`;

  const exists =
    await this.addressModel.exists({
      fockisAddressId:
        candidate,
    });

  if (!exists) {
    return candidate;
  }
}

throw new BadRequestException(
  "Could not allocate a unique Fockis Address ID.",
);
}

private getUnitId(
unit: AddressUnit,
): Types.ObjectId {
const documentUnit =
unit as AddressUnitWithId;
return documentUnit._id;

}

private findUnit(
address: FockisAddressDocument,
unitId: string,
): AddressUnit | undefined {
return address.units.find(
(unit) => {
const id =
this.getUnitId(unit);
    return (
      id.toString() ===
      unitId
    );
  },
);
}

async list(
countryCode?: string,
q?: string,
) {
const filter: Record<
string,
unknown
> = {
status: AddressStatus.ACTIVE,
};
if (countryCode?.trim()) {
  filter.countryCode =
    countryCode
      .trim()
      .toUpperCase();
}

if (q?.trim()) {
  const escaped =
    q.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const regex =
    new RegExp(
      escaped,
      "i",
    );

  filter.$or = [
    {
      fockisAddressId:
        regex,
    },
    {
      addressLine:
        regex,
    },
    {
      neighborhood:
        regex,
    },
    {
      communeOrCity:
        regex,
    },
    {
      buildingName:
        regex,
    },
    {
      street:
        regex,
    },
    {
      landmark:
        regex,
    },
  ];
}

return this.addressModel
  .find(filter)
  .sort({
    updatedAt: -1,
  })
  .limit(500)
  .lean()
  .exec();
}

async get(
id: string,
) {
if (
!Types.ObjectId.isValid(id)
) {
throw new BadRequestException(
"Invalid Fockis address ID.",
);
}
const address =
  await this.addressModel
    .findOne({
      _id: id,
      status:
        AddressStatus.ACTIVE,
    })
    .lean()
    .exec();

if (!address) {
  throw new NotFoundException(
    "Fockis address not found.",
  );
}

return address;
}

async create(
dto: CreateAddressDto,
user: CurrentUser,
) {
const creator =
this.userId(user);
const countryCode =
  dto.countryCode
    .trim()
    .toUpperCase();

if (
  !/^[A-Z]{2}$/.test(
    countryCode,
  )
) {
  throw new BadRequestException(
    "countryCode must be a valid ISO alpha-2 country code.",
  );
}

const fockisAddressId =
  await this.nextAddressId(
    countryCode,
    dto.communeOrCity,
  );

const created =
  await this.addressModel.create(
    {
      ...dto,
      countryCode,
      fockisAddressId,
      createdBy: creator,
      managers: [creator],
      status:
        AddressStatus.ACTIVE,
      units: [],
    } as never,
  );

return created.toObject();

}

async update(
id: string,
dto: UpdateAddressDto,
) {
if (
!Types.ObjectId.isValid(id)
) {
throw new BadRequestException(
"Invalid Fockis address ID.",
);
}
const update: Record<
  string,
  unknown
> = {
  ...dto,
};

if (dto.countryCode) {
  const countryCode =
    dto.countryCode
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z]{2}$/.test(
      countryCode,
    )
  ) {
    throw new BadRequestException(
      "countryCode must be a valid ISO alpha-2 country code.",
    );
  }

  update.countryCode =
    countryCode;
}

const address =
  await this.addressModel
    .findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      },
    )
    .lean()
    .exec();

if (!address) {
  throw new NotFoundException(
    "Fockis address not found.",
  );
}

return address;

}

async deactivate(
id: string,
) {
if (
!Types.ObjectId.isValid(id)
) {
throw new BadRequestException(
"Invalid Fockis address ID.",
);
}
const address =
  await this.addressModel
    .findByIdAndUpdate(
      id,
      {
        $set: {
          status:
            AddressStatus.INACTIVE,
        },
      },
      {
        new: true,
      },
    )
    .lean()
    .exec();

if (!address) {
  throw new NotFoundException(
    "Fockis address not found.",
  );
}

return address;
}

async addUnit(
id: string,
dto: CreateUnitDto,
) {
if (
!Types.ObjectId.isValid(id)
) {
throw new BadRequestException(
"Invalid Fockis address ID.",
);
}

const address =
  await this.addressModel
    .findById(id);

if (!address) {
  throw new NotFoundException(
    "Fockis address not found.",
  );
}

if (
  address.status !==
  AddressStatus.ACTIVE
) {
  throw new BadRequestException(
    "Units cannot be added to an inactive address.",
  );
}

const unitNumber =
  dto.unitNumber.trim();

const duplicate =
  address.units.some(
    (unit) =>
      unit.unitNumber
        .trim()
        .toLowerCase() ===
      unitNumber.toLowerCase(),
  );

if (duplicate) {
  throw new BadRequestException(
    "That unit number already exists.",
  );
}

address.units.push({
  unitNumber,
  floor:
    dto.floor?.trim(),
  unitType:
    dto.unitType ??
    "APARTMENT",
  status:
    UnitStatus.ACTIVE,
  associatedUserIds: [],
} as AddressUnit);

await address.save();

return address.toObject();

}

async updateUnit(
addressId: string,
unitId: string,
dto: UpdateUnitDto,
) {
if (
!Types.ObjectId.isValid(
addressId,
)
) {
throw new BadRequestException(
"Invalid Fockis address ID.",
);
}
if (
  !Types.ObjectId.isValid(
    unitId,
  )
) {
  throw new BadRequestException(
    "Invalid Fockis unit ID.",
  );
}

const address =
  await this.addressModel
    .findById(addressId);

if (!address) {
  throw new NotFoundException(
    "Fockis address not found.",
  );
}

const unit =
  this.findUnit(
    address,
    unitId,
  );

if (!unit) {
  throw new NotFoundException(
    "Fockis unit not found.",
  );
}

const currentUnitId =
  this.getUnitId(unit);

if (
  dto.unitNumber !==
  undefined
) {
  const unitNumber =
    dto.unitNumber.trim();

  const duplicate =
    address.units.some(
      (existing) => {
        const existingId =
          this.getUnitId(
            existing,
          );

        return (
          existingId.toString() !==
            currentUnitId.toString() &&
          existing.unitNumber
            .trim()
            .toLowerCase() ===
            unitNumber.toLowerCase()
        );
      },
    );

  if (duplicate) {
    throw new BadRequestException(
      "That unit number already exists.",
    );
  }

  unit.unitNumber =
    unitNumber;
}

if (
  dto.floor !==
  undefined
) {
  unit.floor =
    dto.floor.trim();
}

if (
  dto.unitType !==
  undefined
) {
  unit.unitType =
    dto.unitType;
}

await address.save();

return address.toObject();

}

async createRequest(
dto: {
addressId: string;
unitId: string;
note?: string;
},
user: CurrentUser,
) {
const requesterId =
this.userId(user);
if (
  !Types.ObjectId.isValid(
    dto.addressId,
  )
) {
  throw new BadRequestException(
    "Invalid Fockis address ID.",
  );
}

if (
  !Types.ObjectId.isValid(
    dto.unitId,
  )
) {
  throw new BadRequestException(
    "Invalid Fockis unit ID.",
  );
}

const address =
  await this.addressModel
    .findOne({
      _id: dto.addressId,
      status:
        AddressStatus.ACTIVE,
    });

if (!address) {
  throw new NotFoundException(
    "Fockis address not found.",
  );
}

const unit =
  this.findUnit(
    address,
    dto.unitId,
  );

if (
  !unit ||
  unit.status !==
    UnitStatus.ACTIVE
) {
  throw new NotFoundException(
    "Fockis unit not found.",
  );
}

const unitId =
  this.getUnitId(unit);

const alreadyAssociated =
  unit.associatedUserIds?.some(
    (associatedUserId) =>
      associatedUserId.toString() ===
      requesterId.toString(),
  );

if (alreadyAssociated) {
  throw new BadRequestException(
    "You are already associated with this unit.",
  );
}

const existing =
  await this.requestModel
    .findOne({
      addressId:
        address._id,
      unitId,
      requesterId,
      status:
        AddressRequestStatus.PENDING,
    })
    .exec();

if (existing) {
  throw new BadRequestException(
    "You already have a pending request for this unit.",
  );
}

const created =
  await this.requestModel.create(
    {
      addressId:
        address._id,
      unitId,
      requesterId,
      note:
        dto.note?.trim(),
      status:
        AddressRequestStatus.PENDING,
    } as never,
  );

return created.toObject();
}

async myRequests(
user: CurrentUser,
) {
const requesterId =
this.userId(user);
return this.requestModel
  .find({
    requesterId,
  })
  .sort({
    createdAt: -1,
  })
  .lean()
  .exec();
}

async listRequests() {
return this.requestModel
.find({})
.sort({
createdAt: -1,
})
.limit(500)
.lean()
.exec();
}

async approveRequest(
requestId: string,
reviewer: CurrentUser,
reviewNote?: string,
) {
const reviewerId =
this.userId(reviewer);
if (
  !Types.ObjectId.isValid(
    requestId,
  )
) {
  throw new BadRequestException(
    "Invalid address request ID.",
  );
}

const request =
  await this.requestModel
    .findById(requestId);

if (!request) {
  throw new NotFoundException(
    "Address request not found.",
  );
}

if (
  request.status !==
  AddressRequestStatus.PENDING
) {
  throw new BadRequestException(
    "Only pending requests can be approved.",
  );
}

const address =
  await this.addressModel
    .findOne({
      _id:
        request.addressId,
      status:
        AddressStatus.ACTIVE,
    });

if (!address) {
  throw new NotFoundException(
    "Fockis address no longer exists or is inactive.",
  );
}

const unit =
  this.findUnit(
    address,
    request.unitId.toString(),
  );

if (
  !unit ||
  unit.status !==
    UnitStatus.ACTIVE
) {
  throw new NotFoundException(
    "Fockis unit no longer exists or is inactive.",
  );
}

const alreadyAssociated =
  unit.associatedUserIds?.some(
    (associatedUserId) =>
      associatedUserId.toString() ===
      request.requesterId.toString(),
  );
if (!alreadyAssociated) {
unit.associatedUserIds.push(
request.requesterId as unknown as typeof unit.associatedUserIds[number],
);
}


request.status =
  AddressRequestStatus.APPROVED;

request.reviewedBy =
  reviewerId;

request.reviewedAt =
  new Date();

request.reviewNote =
  reviewNote?.trim();

await address.save();
await request.save();

return request.toObject();
}

async rejectRequest(
requestId: string,
reviewer: CurrentUser,
reviewNote?: string,
) {
const reviewerId =
this.userId(reviewer);
if (
  !Types.ObjectId.isValid(
    requestId,
  )
) {
  throw new BadRequestException(
    "Invalid address request ID.",
  );
}

const request =
  await this.requestModel
    .findById(requestId);

if (!request) {
  throw new NotFoundException(
    "Address request not found.",
  );
}

if (
  request.status !==
  AddressRequestStatus.PENDING
) {
  throw new BadRequestException(
    "Only pending requests can be rejected.",
  );
}

request.status =
  AddressRequestStatus.REJECTED;

request.reviewedBy =
  reviewerId;

request.reviewedAt =
  new Date();

request.reviewNote =
  reviewNote?.trim();

await request.save();

return request.toObject();
}

async revokeRequest(
requestId: string,
reviewer: CurrentUser,
reviewNote?: string,
) {
const reviewerId =
this.userId(reviewer);
if (
  !Types.ObjectId.isValid(
    requestId,
  )
) {
  throw new BadRequestException(
    "Invalid address request ID.",
  );
}

const request =
  await this.requestModel
    .findById(requestId);

if (!request) {
  throw new NotFoundException(
    "Address request not found.",
  );
}

if (
  request.status !==
  AddressRequestStatus.APPROVED
) {
  throw new BadRequestException(
    "Only approved requests can be revoked.",
  );
}

const address =
  await this.addressModel
    .findById(
      request.addressId,
    );

if (address) {
  const unit =
    this.findUnit(
      address,
      request.unitId.toString(),
    );

  if (unit) {
    unit.associatedUserIds =
      unit.associatedUserIds.filter(
        (associatedUserId) =>
          associatedUserId.toString() !==
          request.requesterId.toString(),
      );

    await address.save();
  }
}

request.status =
  AddressRequestStatus.REVOKED;

request.reviewedBy =
  reviewerId;

request.reviewedAt =
  new Date();

request.reviewNote =
  reviewNote?.trim();

await request.save();

return request.toObject();
}
}
