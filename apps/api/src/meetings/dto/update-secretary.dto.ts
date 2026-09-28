import {
  IsBoolean,
  IsOptional,
} from "class-validator";

export class UpdateSecretaryDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  takeNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  generateTranscript?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyMainPoints?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyDecisions?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyActionItems?: boolean;

  @IsOptional()
  @IsBoolean()
  identifyQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  generateSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  generatePdfReport?: boolean;
}