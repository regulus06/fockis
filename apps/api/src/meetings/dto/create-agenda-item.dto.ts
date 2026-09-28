import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateAgendaItemDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}