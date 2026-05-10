import NextAuth, { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { GuildedSession, GuildedUser } from "./session-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const authOptions = {
  session: { strategy: "jwt" as const },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:    credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        return {
          id:          data.user_id as string,
          email:       data.email   as string,
          name:        data.name    as string,
          accessToken: data.access_token as string,
        };
      },
    }),
  ],
  callbacks: {
    // Accepts the structurally minimal type that covers both User and AdapterUser.
    // accessToken is accessed via cast because the default User type doesn't
    // declare it (we avoid module augmentation to prevent JWT identity conflicts).
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: { id?: string; name?: string | null; email?: string | null; image?: string | null } | null;
    }) {
      if (user) {
        token.sub         = (user as { id?: string }).id;
        token.accessToken = (user as { accessToken?: string }).accessToken;
      }
      return token;
    },
    // Accepts next-auth's default Session structure on input and augments
    // the user object with id + accessToken from the JWT before returning.
    async session(params: {
      session: { user?: { name?: string | null; email?: string | null; image?: string | null } | null; expires: string };
      token: JWT;
    }) {
      const s = params.session as unknown as GuildedSession;
      s.user = (s.user ?? {}) as GuildedUser;
      s.user.id          = params.token.sub ?? "";
      s.user.accessToken = (params.token.accessToken as string) ?? "";
      return s;
    },
  },
  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getGuildedSession(): Promise<GuildedSession | null> {
  return getServerSession(authOptions) as Promise<GuildedSession | null>;
}
