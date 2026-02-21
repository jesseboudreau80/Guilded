import { Tier } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier?: Tier;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
