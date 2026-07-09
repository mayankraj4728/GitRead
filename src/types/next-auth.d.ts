import type { DefaultSession } from "next-auth";

// Augment the session with our extra user fields.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      githubLogin?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    githubLogin?: string | null;
  }
}
