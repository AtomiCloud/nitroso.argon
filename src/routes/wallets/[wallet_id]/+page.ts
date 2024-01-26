import type { PageLoad } from "./$types";
import { toResult } from "$lib/utility";
import type { ProblemDetails } from "../../../errors/problem_details";
import { NewApi } from "../../../store";
import type { WalletRes } from "$lib/api/core/data-contracts";

export const load = (async ({
  params,
  parent,
}): Promise<{
  result: ["err", ProblemDetails] | ["ok", WalletRes];
}> => {
  const data = await parent();
  const api = NewApi({ data });

  const walletId = params.wallet_id;
  //@ts-ignore
  const userId = data.session.roles?.includes("admin")
    ? undefined
    : data.user?.principal.id ?? "";

  const r = await toResult(
    () => api.vWalletDetail2(walletId, "1", { userId }),
    "Fail to get wallet",
  ).serial();

  return {
    result: r,
  };
}) satisfies PageLoad;
