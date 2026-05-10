// Shared session types for both server (lib/auth.ts) and client (lib/session.ts).
// Kept in a separate file to avoid circular imports.

export type GuildedUser = {
  id: string;
  accessToken: string;
  name?: string | null;
  email?: string | null;
};

export type GuildedSession = {
  user: GuildedUser;
  expires: string;
};
