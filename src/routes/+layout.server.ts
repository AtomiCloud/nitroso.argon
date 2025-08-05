import type { LayoutServerLoad } from './$types';
import type { Session } from '@auth/core/types';
import { NewApi } from '../store';
import { expired, toResult } from '$lib/utility';
import { jwtDecode } from 'jwt-decode';
import type { JWT } from '@auth/core/jwt';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, route }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session: any | null = await locals.getSession();

  const signIn =
    session?.user != null &&
    (session.access_token == null || expired(session.access_token, new Date())) &&
    (session.id_token == null || expired(session.id_token, new Date()));
  // redirect to login if not logged in
  if (route.id === '/register' && session?.user == null) throw redirect(307, '/');

  // ask FE to re-authenticate
  if (session?.user == null || signIn) return { session, auth: { signIn } };

  // full public pages accessible during registering

  if (['/terms', '/privacy'].includes(route?.id ?? '')) return { session, auth: { signIn } };

  // load user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: { data: any } = { data: { session } };
  // if (config.app.landscape !== "lapras") c.fetch = fetch;

  const api = NewApi(c);
  const accessToken: JWT = jwtDecode(session.access_token) as JWT;
  const idToken: {
    aud: string[];
    email: string;
    email_verified: boolean;
    exp: number;
    iat: number;
    iss: string;
    name: string;
    picture: string;
    rexp: string;
    scope: string;
    sub: string;
  } = jwtDecode(session.id_token);
  const s = accessToken.sub ?? '';

  const user = toResult(() => api.vUserDetail2(s, '1'), `Failed to fetch user ${s}`);

  const ok = await user.isOk();

  if (route.id === '/register') {
    if (ok) {
      throw redirect(307, '/');
    } else {
      return { session, auth: { signIn } };
    }
  } else {
    if (ok) {
      // update user if necessary
      const u = await user.unwrap();

      // Helper function to compare arrays regardless of order
      const arraysEqual = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((val, index) => val === sortedB[index]);
      };

      const rolesMatch = u.principal.roles
        ? arraysEqual(u.principal.roles, accessToken.roles)
        : accessToken.roles.length === 0;
      if (
        u.principal.id == null ||
        u.principal.id !== idToken.sub ||
        u.principal.email == null ||
        u.principal.email !== idToken.email ||
        u.principal.roles == null ||
        !rolesMatch ||
        u.principal.emailVerified == null ||
        u.principal.emailVerified !== idToken.email_verified
      ) {
        await toResult(
          () =>
            api.vUserUpdate(idToken.sub, '1', {
              accessToken: session.access_token,
              idToken: session.id_token,
              username: u.principal.username,
            }),
          'Failed to update user',
        ).match({
          ok: () => {},
          err: e => {
            console.debug(JSON.stringify(e));
          },
        });
      }

      return {
        session,
        user: u,
        auth: { signIn },
      };
    } else {
      throw redirect(307, '/register');
    }
  }
};
