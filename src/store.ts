import type { ApiConfig } from "$lib/api/core/http-client";
import { Api } from "$lib/api/core/Api";
import type { Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import { config } from "./config/shared";
import { page } from "$app/stores";
import type { Session } from "@auth/core/types";
import { expired } from "$lib/utility";
import { signIn } from "@auth/sveltekit/client";
import type { ProblemDetails } from "./errors/problem_details";

export const problem: Writable<ProblemDetails | null> = writable(null);

export const loading: Writable<boolean> = writable(false);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function NewApi({ data, fetch }: { data?: any; fetch?: any }): Api {
  const c = {
    baseUrl: `${config.api.scheme}://${config.api.domain}`,
    securityWorker: async () => {
      const s = data?.session;
      if (
        s &&
        s?.access_token != null &&
        !expired(s.access_token, new Date())
      ) {
        return {
          headers: {
            Authorization: `Bearer ${s.access_token}`,
          },
        };
      }
      return {};
    },
  } as ApiConfig;
  if (fetch != null) {
    c.customFetch = fetch;
  }
  return new Api(c);
}

export const api = writable(
  new Api({
    baseUrl: `${config.api.scheme}://${config.api.domain}`,
    securityWorker: async () => {
      const s = get(page).data.session as Session;
      if (
        s != null &&
        (s.access_token == null || expired(s.access_token, new Date()))
      ) {
        await signIn("descope");
      }
      if (
        s &&
        s?.access_token != null &&
        !expired(s.access_token, new Date())
      ) {
        return {
          headers: {
            Authorization: `Bearer ${s.access_token}`,
          },
        };
      }
      return {};
    },
  }),
);
