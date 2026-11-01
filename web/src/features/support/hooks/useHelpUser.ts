import { useEffect, useState } from "react";

import api from "../../../api/api";
import { getToken } from "../../../utils/auth";

export interface HelpUser {
  _id?: string;
  id?: string;
  username?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  profilePicture?: string | null;
}

type State = { user: HelpUser | null; status: "loading" | "ready" | "signed-out" };

let cache: State | null = null;
let pending: Promise<State> | null = null;

async function load(): Promise<State> {
  if (!getToken()) return { user: null, status: "signed-out" };
  try {
    const { data } = await api.get<HelpUser & { user?: HelpUser }>("/users/me");
    const user = data?.user ?? data;
    return user ? { user, status: "ready" } : { user: null, status: "signed-out" };
  } catch {
    return { user: null, status: "signed-out" };
  }
}

/** The signed-in Fockis account (GET /users/me), shared by every Help page. */
export function useHelpUser(): State {
  const [state, setState] = useState<State>(cache ?? { user: null, status: getToken() ? "loading" : "signed-out" });

  useEffect(() => {
    if (cache) return;
    let alive = true;
    pending = pending ?? load();
    pending.then((result) => {
      cache = result;
      pending = null;
      if (alive) setState(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

export function helpDisplayName(user: HelpUser | null): string {
  if (!user) return "";
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "";
}
