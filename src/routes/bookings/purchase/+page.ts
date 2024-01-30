import type { PassengerPrincipalRes } from "$lib/api/core/data-contracts";
import { toResult } from "$lib/utility";
import type { PageLoad } from "./$types";
import type { ProblemDetails } from "../../../errors/problem_details";
import { NewApi } from "../../../store";

export const load = (async ({
  parent,
  url,
}): Promise<{
  result: ["err", ProblemDetails] | ["ok", PassengerPrincipalRes[]];
}> => {
  const { session, user } = await parent();

  const api = NewApi({ data: { session } });
  const userId = session.roles?.includes("admin")
    ? undefined
    : user?.principal.id ?? "";

  const r = await toResult(
    () =>
      api.vPassengerDetail("1", {
        UserId: userId,
      }),
    "Fail to get passengers",
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
