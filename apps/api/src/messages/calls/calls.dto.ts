import { Transform } from "class-transformer";
import { IsIn, IsMongoId, IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { CALL_TYPES, DEVICE_PLATFORMS } from "./call.schemas";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class StartCallDto {
  @IsMongoId()
  receiverId!: string;

  @IsIn(CALL_TYPES)
  type!: "voice" | "video";

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}

export class CallDeviceDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  deviceId?: string;
}

export class RegisterDeviceDto {
  @Transform(trim)
  @Matches(/^[A-Za-z0-9._:-]{8,100}$/, { message: "Invalid device ID." })
  deviceId!: string;

  @IsIn(DEVICE_PLATFORMS)
  platform!: "android" | "ios" | "web";

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4096)
  pushToken?: string;

  @IsOptional()
  @Transform(trim)
  @Matches(/^[0-9a-fA-F]{32,200}$/, { message: "Invalid VoIP token." })
  voipToken?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  deviceName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}

export class PushCallActionDto {
  @IsString()
  @MaxLength(2000)
  token!: string;
}
