/* ============================================================================
   PUBLIC USER FIELDS
   apps/api/src/users/public-user.fields.ts

   The only user fields that may be sent to OTHER users (friend lists,
   suggestions, requests, search, group members, order parties, ...).

   Never add private or account data here: email, phone, birth date,
   gender, passwords and password history, reset tokens, MFA data, login
   IPs, roles and permissions, payment or subscription details.

   Users who want to share contact details can put them in their bio,
   which is public by their own choice.
============================================================================ */

export const PUBLIC_USER_FIELDS = [
  "_id",
  "fockisId",
  "username",
  "firstName",
  "lastName",
  "profilePicture",
  "coverPhoto",
  "bio",
  "location",
  "website",
  "verified",
  "premium",
  "accountType",
  "isActive",
  "isPrivate",
  "online",
  "lastSeen",
  "followersCount",
  "followingCount",
  "friendsCount",
] as const;

/** Mongoose `.select()` / `.populate()` projection for public user data. */
export const PUBLIC_USER_SELECT = PUBLIC_USER_FIELDS.join(" ");

/**
 * Minimal identity for places that only need to show who someone is
 * (order buyer / seller, group members).
 */
export const USER_IDENTITY_SELECT =
  "_id username firstName lastName profilePicture verified";
