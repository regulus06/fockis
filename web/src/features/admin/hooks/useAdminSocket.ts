import { useEffect, useState } from "react";
import { getSocket } from "../../../socket/client";

export type Rule = {
  type: "country" | "city" | "state";
  value: string;
  action: "block" | "allow";
  reason?: string;
};

export type Stats = {
  total: number;
  blocks: number;
  allows: number;
};

export function useAdminSocket() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    blocks: 0,
    allows: 0,
  });

  useEffect(() => {
    const socket = getSocket();

    socket.connect();

    const handleRules = (data: Rule[]) => {
      setRules(data);
    };

    const handleStats = (data: Stats) => {
      setStats(data);
    };

    socket.on("rules.updated", handleRules);
    socket.on("rules.stats", handleStats);

    return () => {
      socket.off("rules.updated", handleRules);
      socket.off("rules.stats", handleStats);
    };
  }, []);

  return {
    rules,
    setRules,
    stats,
  };
}