"use client";

import { useSession } from "next-auth/react";
import type { GuildedSession } from "./session-types";

export type { GuildedUser, GuildedSession } from "./session-types";

/**
 * Client-component equivalent of getGuildedSession().
 * Returns a properly typed GuildedSession instead of relying on module
 * augmentation, which does not survive the next-auth subpath boundary.
 */
export function useGuildedSession() {
  const { data, status } = useSession();
  return { data: data as GuildedSession | null, status };
}
