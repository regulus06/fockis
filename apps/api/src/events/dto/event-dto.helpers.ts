import { Transform } from "class-transformer";

/*
 * Multipart (FormData) requests send every field as a string. These
 * transforms keep JSON and multipart bodies equivalent.
 */

/** "" / undefined -> undefined, "null" / null -> null, numeric strings -> number. */
export function NullableNumber() {
  return Transform(({ value }) => {
    if (value === undefined || value === "") {
      return undefined;
    }

    if (value === null || value === "null") {
      return null;
    }

    const number = typeof value === "number" ? value : Number(value);

    return Number.isFinite(number) ? number : value;
  });
}

export function OptionalBoolean() {
  return Transform(({ value }) => {
    if (value === undefined || value === "") {
      return undefined;
    }

    if (value === true || value === "true" || value === "1") {
      return true;
    }

    if (value === false || value === "false" || value === "0") {
      return false;
    }

    return value;
  });
}

export function EmptyToUndefined() {
  return Transform(({ value }) => (value === "" ? undefined : value));
}

export function Trimmed() {
  return Transform(({ value }) => (typeof value === "string" ? value.trim() : value));
}
