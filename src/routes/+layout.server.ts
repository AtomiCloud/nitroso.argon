import type { LayoutServerLoad } from "./$types";
import type { Session } from "@auth/core/types";
import { NewApi } from "../store";
import { expired, toResult } from "$lib/utility";
import { jwtDecode } from "jwt-decode";
import type { JWT } from "@auth/core/jwt";
import { redirect } from "@sveltejs/kit";
import { config } from "../config/server";

export const load: LayoutServerLoad = async ({ locals, route }) => {
  const session: Session | null = await locals.getSession();

  console.log(config);

  const signIn =
    session?.user != null &&
    (session.access_token == null || expired(session.access_token, new Date()));
  if (route.id === "/register" && session?.user == null)
    throw redirect(307, "/");

  if (session?.user == null || signIn) return { session, auth: { signIn } };

  // load user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: { data: any } = { data: { session } };
  // if (config.app.landscape !== "lapras") c.fetch = fetch;

  const api = NewApi(c);
  const s = (jwtDecode(session.access_token!) as JWT).sub ?? "";

  const user = toResult(
    () => api.vUserDetail2(s, "1"),
    `Failed to fetch user ${s}`,
  );

  const ok = await user.isOk();

  if (route.id === "/register") {
    if (ok) {
      throw redirect(307, "/");
    } else {
      return { session, auth: { signIn } };
    }
  } else {
    if (ok) {
      return {
        session,
        user: await user.unwrap(),
        auth: { signIn },
      };
    } else {
      throw redirect(307, "/register");
    }
  }
};
