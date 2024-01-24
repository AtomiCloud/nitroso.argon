import type { ProblemDetails } from "../../errors/problem_details";
import type { DiscountPrincipalRes } from "$lib/api/core/data-contracts";
import { NewApi } from "../../store";
import { toResult } from "$lib/utility";
import type { PageLoad } from "./$types";

export const load = (async ({
  parent,
  url,
}): Promise<{
  result: ["err", ProblemDetails] | ["ok", DiscountPrincipalRes[]];
}> => {
  const { session } = await parent();

  const api = NewApi({ data: { session } });

  const search = url.searchParams.get("search") ?? "";
  const discountType = url.searchParams.get("discountType") ?? "";
  const matchMode = url.searchParams.get("matchMode") ?? "";
  const disabled = url.searchParams.get("disabled") ?? "";

  const query: any = {
    Search: search,
    DiscountType: discountType,
    MatchMode: matchMode,
  };

  if (disabled) query["Disabled"] = disabled === "true";

  const r = await toResult(
    () => api.vDiscountDetail("1", query),
    "Fail to get discounts",
  ).serial();

  return {
    result: r,
  };
}) satisfies PageLoad;
