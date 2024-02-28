import type {
  MaterializedCostRes,
  PassengerPrincipalRes,
} from "$lib/api/core/data-contracts";
import { toResult } from "$lib/utility";
import type { PageLoad } from "./$types";
import type { ProblemDetails } from "../../../errors/problem_details";
import { NewApi } from "../../../store";
import { Res } from "$lib/core/result";

export const load = (async ({
  parent,
  url,
}): Promise<{
  result:
    | ["err", ProblemDetails[]]
    | ["ok", [PassengerPrincipalRes[], MaterializedCostRes]];
}> => {
  const { session, user } = await parent();

  const api = NewApi({ data: { session } });
  const userId = session.roles?.includes("admin")
    ? undefined
    : user?.principal.id ?? "";

  const passengers = await toResult(
    () =>
      api.vPassengerDetail("1", {
        UserId: userId,
      }),
    "Fail to get passengers",
  );

  const cost = toResult(() => api.vCostSelfDetail("1"), "Failed to get cost");

  const result = await Res.all(passengers, cost).serial();

  return {
    result,
  };
}) satisfies PageLoad;
