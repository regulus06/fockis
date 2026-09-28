import {
  IsBoolean,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateMeetingSettingsDto {
  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowJoinBeforeHost?: boolean;

  @IsOptional()
  @IsBoolean()
  muteParticipantsOnEntry?: boolean;

  @IsOptional()
  @IsString()
  screenShareWhoCanShare?: "host_only" | "everyone";

  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;
}