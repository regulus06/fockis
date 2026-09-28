import { BadRequestException } from "@nestjs/common";
import { Types } from "mongoose";

export function isValidObjectId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value) &&
    String(new Types.ObjectId(value)) === value.toLowerCase()
  );
}

export function toObjectId(
  value: string,
  fieldName = "id",
): Types.ObjectId {
  if (!isValidObjectId(value)) {
    throw new BadRequestException(
      `${fieldName} must be a valid identifier.`,
    );
  }

  return new Types.ObjectId(value);
}

export function toObjectIdOrNull(
  value: string | null | undefined,
  fieldName = "id",
): Types.ObjectId | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return toObjectId(value, fieldName);
}