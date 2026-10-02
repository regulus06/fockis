import { getSocket } from "../client";

export const subscribeAdminRules = (
  onRules: (data: any) => void,
  onStats: (data: any) => void
) => {
  const socket = getSocket();

  socket.on("rules.updated", onRules);
  socket.on("rules.stats", onStats);

  return () => {
    socket.off("rules.updated", onRules);
    socket.off("rules.stats", onStats);
  };
};