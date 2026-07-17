import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

/**
 * Auth.js (NextAuth v5) configuration.
 * - GitHub is the ONLY provider (no email/password).
 * - `repo` scope so both public and private Markdown repos are readable.
 * - Database sessions via the Prisma adapter; we store minimal user info.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  pages: { signIn: "/" },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: { params: { scope: "read:user user:email repo" } },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubLogin: profile.login,
        };
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // `githubLogin` is mirrored on the User row by the profile() mapping.
        session.user.githubLogin = (user as { githubLogin?: string | null }).githubLogin ?? null;
      }
      return session;
    },
  },
  events: {
    /**
     * Auth.js only stores the OAuth token when the account is FIRST linked.
     * If the user revokes the app on GitHub and signs in again, the fresh
     * token must replace the dead one — otherwise every GitHub call keeps
     * failing with 401 even after re-authentication.
     */
    async signIn({ user, account }) {
      if (account?.provider === "github" && user.id && account.access_token) {
        await prisma.account.updateMany({
          where: { userId: user.id, provider: "github" },
          data: {
            access_token: account.access_token,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at ?? undefined,
            token_type: account.token_type ?? undefined,
            scope: account.scope ?? undefined,
          },
        });
      }
    },
  },
});
