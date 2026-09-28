import {
Body,
Controller,
Get,
Param,
Patch,
Post,
Query,
Req,
UseGuards,
BadRequestException,
} from "@nestjs/common";

import { MapService } from "./map.service";

import {
MapPermission,
MapPermissionGuard,
} from "./map.guard";

import {
MAP_PERMISSIONS,
} from "./map.permissions";

import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import {
CreateAddressRequestDto,
} from "./dto/create-address-request.dto";

@Controller("map")
export class MapController {
constructor(
private readonly mapService: MapService,
) {}

@Get("addresses")
list(
@Query("countryCode")
countryCode?: string,

@Query("q")
q?: string,
) {
return this.mapService.list(
countryCode,
q,
);
}

@Get("addresses/:id")
get(
@Param("id")
id: string,
) {
return this.mapService.get(id);
}

@Post("addresses")
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.ADDRESS_CREATE,
)
create(
@Body()
dto: CreateAddressDto,
@Req()
req: any,

) {
return this.mapService.create(
dto,
req.user,
);
}

@Patch("addresses/:id")
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.ADDRESS_UPDATE,
)
update(
@Param("id")
id: string,
@Body()
dto: UpdateAddressDto,

) {
return this.mapService.update(
id,
dto,
);
}

@Post("addresses/:id/deactivate")
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.ADDRESS_DEACTIVATE,
)
deactivate(
@Param("id")
id: string,
) {
return this.mapService.deactivate(
id,
);
}

@Post("addresses/:id/units")
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.UNIT_CREATE,
)
addUnit(
@Param("id")
id: string,
@Body()
dto: CreateUnitDto,

) {
return this.mapService.addUnit(
id,
dto,
);
}

@Patch(
"addresses/:addressId/units/:unitId",
)
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.UNIT_UPDATE,
)
updateUnit(
@Param("addressId")
addressId: string,
@Param("unitId")
unitId: string,

@Body()
dto: UpdateUnitDto,

) {
return this.mapService.updateUnit(
addressId,
unitId,
dto,
);
}

@Post("address-requests")
createRequest(
@Body()
dto: CreateAddressRequestDto,
@Req()
req: any,

) {
if (!dto.addressId) {
throw new BadRequestException(
"addressId is required when creating a Fockis Map address request.",
);
}
if (!dto.unitId) {
  throw new BadRequestException(
    "unitId is required when creating a Fockis Map address request.",
  );
}

return this.mapService.createRequest(
  {
    addressId: dto.addressId,
    unitId: dto.unitId,
    note: dto.reason,
  },
  req.user,
);
}

@Get("address-requests/me")
myRequests(
@Req()
req: any,
) {
return this.mapService.myRequests(
req.user,
);
}

@Get("address-requests")
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.REQUEST_REVIEW,
)
listRequests() {
return this.mapService.listRequests();
}

@Post(
"address-requests/:id/approve",
)
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.REQUEST_APPROVE,
)
approveRequest(
@Param("id")
id: string,
@Body()
body: {
  reviewNote?: string;
},

@Req()
req: any,

) {
return this.mapService.approveRequest(
id,
req.user,
body?.reviewNote,
);
}

@Post(
"address-requests/:id/reject",
)
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.REQUEST_REJECT,
)
rejectRequest(
@Param("id")
id: string,
@Body()
body: {
  reviewNote?: string;
},

@Req()
req: any,

) {
return this.mapService.rejectRequest(
id,
req.user,
body?.reviewNote,
);
}

@Post(
"address-requests/:id/revoke",
)
@UseGuards(MapPermissionGuard)
@MapPermission(
MAP_PERMISSIONS.REQUEST_REVOKE,
)
revokeRequest(
@Param("id")
id: string,

@Body()
body: {
  reviewNote?: string;
},

@Req()
req: any,
) {
return this.mapService.revokeRequest(
id,
req.user,
body?.reviewNote,
);
}
}
