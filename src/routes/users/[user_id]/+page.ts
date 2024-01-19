import type { PageLoad } from "./$types";
import { toResult } from "$lib/utility";
import type { ProblemDetails } from "../../../errors/problem_details";
import { NewApi } from "../../../store";
import type { UserRes } from "$lib/api/core/data-contracts";

export const load = (async ({
  params,
  parent,
}): Promise<{
  result: ["err", ProblemDetails] | ["ok", UserRes];
}> => {
  const data = await parent();
  const api = NewApi({ data });

  const userId = params.user_id;

  const r = await toResult(
    () => api.vUserDetail2(userId, "1"),
    "Fail to get user",
  ).serial();

  return {
    result: r,
  };
}) satisfies PageLoad;
