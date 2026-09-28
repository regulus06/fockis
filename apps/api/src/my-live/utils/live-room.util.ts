export function createLiveRoomName(
  streamId: string,
): string {
  return `fockis-live-${streamId}`;
}

export function createParticipantIdentity(
  userId: string,
): string {
  return `fockis-user-${userId}`;
}

export function getUserId(
  user: any,
): string {
  return String(
    user?.id ??
      user?._id ??
      user?.sub ??
      "",
  );
}