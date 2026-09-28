import type {
  FockisUser,
} from "../types/fockisprofiletypes";

export function getUserId(
  user?: FockisUser | null,
): string {
  return (
    user?.id ||
    user?._id ||
    ""
  );
}

export function getUserName(
  user?: FockisUser | null,
): string {
  if (!user) {
    return "User";
  }

  return (
    user.name ||
    [
      user.firstName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    user.username ||
    "User"
  );
}

export function getUserAvatar(
  user?: FockisUser | null,
): string | undefined {
  return (
    user?.avatar ||
    user?.profileImage
  );
}

export function getInitials(
  user?: FockisUser | null,
): string {
  const name =
    getUserName(user)
      .trim();

  if (!name) {
    return "U";
  }

  const parts =
    name.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[
      parts.length - 1
    ].charAt(0)
  ).toUpperCase();
}