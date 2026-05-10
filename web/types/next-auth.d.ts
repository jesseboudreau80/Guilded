// Session type augmentation only.
// JWT augmentation is intentionally omitted: it causes a module identity
// conflict between "next-auth/jwt" and the internal "../jwt/types" path
// used by AuthOptions under TypeScript 5.9 + moduleResolution bundler.
// accessToken is stored in the JWT index signature (typed as unknown)
// and accessed via type assertion where needed.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accessToken: string;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    accessToken: string;
  }
}
