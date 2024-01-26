import type { ProblemDetails } from "../../errors/problem_details";
import type { WalletPrincipalRes } from "$lib/api/core/data-contracts";
import { NewApi } from "../../store";
import { toResult } from "$lib/utility";
import type { PageLoad } from "./$types";

export const load = (async ({
  parent,
  url,
}): Promise<{
  result: ["err", ProblemDetails] | ["ok", WalletPrincipalRes[]];
}> => {
  const { session } = await parent();

  const api = NewApi({ data: { session } });

  const search = url.searchParams.get("search") ?? "";

  const r = await toResult(
    () =>
      api.vWalletDetail("1", {
        UserId: search,
      }),
    "Fail to get wallets",
  ).serial();
  return {
    result: r,
  };
}) satisfies PageLoad;
