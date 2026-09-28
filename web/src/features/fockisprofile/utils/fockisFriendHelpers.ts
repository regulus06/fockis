export function getFullName(user: any): string {
  if (!user) {
    return "";
  }

  return [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ");
}