import type { ProblemDetails } from "../../errors/problem_details";
import type {
  CostPrincipalRes,
  WithdrawalPrincipalRes,
} from "$lib/api/core/data-contracts";
import { NewApi } from "../../store";
import { toResult } from "$lib/utility";
import type { PageLoad } from "./$types";

export const load = (async ({
  parent,
  url,
}): Promise<{
  result: ["err", ProblemDetails] | ["ok", CostPrincipalRes[]];
}> => {
  const { session } = await parent();

  const api = NewApi({ data: { session } });

  const r = await toResult(
    () => api.vCostDetail("1"),
    "Fail to get withdrawal",
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
