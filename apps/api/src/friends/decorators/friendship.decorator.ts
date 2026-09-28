export const FRIENDSHIP_STATUS = {

PENDING:"pending",

ACCEPTED:"accepted",

REJECTED:"rejected",

BLOCKED:"blocked",

} as const;



export type FriendshipStatus =
typeof FRIENDSHIP_STATUS[
keyof typeof FRIENDSHIP_STATUS
];