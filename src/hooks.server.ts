import { SvelteKitAuth } from "@auth/sveltekit";
import { jwtDecode } from "jwt-decode";
import { config } from "./config/server";
import type { JWT } from "@auth/core/jwt";
import type { Session } from "@auth/core/types";

function expired(token?: string, now?: Date): boolean {
  if (now == null) now = new Date();
  if (token == null) return true;
  const d = jwtDecode(token) as { exp: number };
  return d.exp * 1000 < now.getTime();
}

export const handle = SvelteKitAuth({
  providers: [
    {
      id: "descope",
      name: "Descope",
      type: "oidc",
      issuer: `https://api.descope.com/${config.auth.clientId}`,
      wellKnown: `https://api.descope.com/${config.auth.clientId}/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email profile" } },
      clientId: config.auth.clientId,
      clientSecret: config.auth.clientSecret,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checks: ["pkce", "state"] as any,
    },
  ],
  callbacks: {
    session: async ({ session, token }) => {
      const t = token as JWT;
      const s = session as Session;
      if (t.raw?.access_token) s.access_token = t.raw.access_token;
      if (t.scopes) s.scopes = t.scopes;
      if (t.roles) s.roles = t.roles ?? [];
      if (t.permissions) s.permissions = t.permissions ?? [];
      return session;
    },
    jwt: async ({ token, account }) => {
      const tkn = token as JWT;
      if (account) {
        token.raw = {
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          id_token: account.id_token,
        };
        if (account.access_token) {
          const t = jwtDecode(account.access_token) as {
            scope?: string;
            roles?: string[];
            permissions?: string[];
          };
          token.scopes = t.scope?.split(" ") ?? [];
          token.roles = t.roles ?? [];
          token.permissions = t.permissions ?? [];
        }
        return token;
      }

      const now = new Date();
      if (!expired(tkn.raw?.access_token ?? "", now)) return token;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { raw, ...t } = token;
      return { ...t };
    },
  },
  trustHost: true,
  secret: config.auth.secret,
});
