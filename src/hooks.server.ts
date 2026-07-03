import { SvelteKitAuth } from '@auth/sveltekit';
import { jwtDecode } from 'jwt-decode';
import { config } from './config/server';
import type { JWT } from '@auth/core/jwt';
import type { Session } from '@auth/core/types';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { negotiateLocale, LOCALE_COOKIE } from '$lib/i18n/resolve';

function expired(token?: string, now?: Date): boolean {
  if (now == null) now = new Date();
  if (token == null) return true;
  const d = jwtDecode(token) as { exp: number };
  return d.exp * 1000 < now.getTime();
}

// Request-scoped locale negotiation. Stores the resolved locale on
// `event.locals` (consumed by +layout.server.ts) and rewrites the `%lang%`
// placeholder in app.html. Never touches any process-global locale state.
const handleLocale: Handle = async ({ event, resolve }) => {
  const cookie = event.cookies.get(LOCALE_COOKIE);
  const acceptLanguage = event.request.headers.get('accept-language');
  const locale = negotiateLocale({ cookie, acceptLanguage });
  event.locals.locale = locale;

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', locale),
  });
};

const authHandle = SvelteKitAuth({
  providers: [
    {
      id: 'descope',
      name: 'Descope',
      type: 'oidc',
      issuer: `https://api.descope.com/${config.auth.clientId}`,
      wellKnown: `https://api.descope.com/${config.auth.clientId}/.well-known/openid-configuration`,
      authorization: { params: { scope: 'openid email profile' } },
      clientId: config.auth.clientId,
      clientSecret: config.auth.clientSecret,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checks: ['pkce', 'state'] as any,
    },
  ],
  callbacks: {
    // @ts-ignore
    session: async ({ session, token }) => {
      const t = token as JWT;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = session as Session | any;
      if (t.raw?.access_token) s.access_token = t.raw.access_token;
      if (t.raw?.refresh_token) s.refresh_token = t.raw.refresh_token;
      if (t.raw?.id_token) s.id_token = t.raw.id_token;
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
          token.scopes = t.scope?.split(' ') ?? [];
          token.roles = t.roles ?? [];
          token.permissions = t.permissions ?? [];
        }
        return token;
      }

      const now = new Date();
      if (!expired(tkn.raw?.access_token ?? '', now)) return token;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { raw, ...t } = token;
      return { ...t };
    },
  },
  trustHost: true,
  secret: config.auth.secret,
});

export const handle = sequence(handleLocale, authHandle);
