/**
 * Returns the authenticated Fockis user ID.
 *
 * The messaging system uses this ID to determine whether a message
 * belongs to the currently logged-in user.
 */
export function useCurrentUserId(): string {
  const storedUserId = localStorage.getItem("userId");

  if (storedUserId) {
    const id = String(storedUserId).trim();

    console.log("[MESSAGES] Current user ID:", id);

    return id;
  }

  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      const parsed = JSON.parse(storedUser);

      const id = String(
        parsed?._id ??
          parsed?.id ??
          parsed?.userId ??
          "",
      ).trim();

      console.log("[MESSAGES] Current user ID from user object:", id);

      return id;
    }
  } catch (error) {
    console.error(
      "[MESSAGES] Failed to read current user:",
      error,
    );

    return "";
  }

  console.warn(
    "[MESSAGES] No authenticated user ID found in localStorage.",
  );

  return "";
}