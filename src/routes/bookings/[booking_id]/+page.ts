import type { PageLoad } from "./$types";
import { toResult } from "$lib/utility";
import type { ProblemDetails } from "../../../errors/problem_details";
import { NewApi } from "../../../store";
import type { BookingRes } from "$lib/api/core/data-contracts";

export const load = (async ({
  params,
  parent,
}): Promise<{
  result: ["err", ProblemDetails] | ["ok", BookingRes];
}> => {
  const data = await parent();
  const api = NewApi({ data });

  const bookingId = params.booking_id;
  //@ts-ignore
  const userId = data.session.roles?.includes("admin")
    ? undefined
    : data.user?.principal.id ?? "";

  const r = await toResult(
    () => api.vBookingDetail2(bookingId, "1", { userId }),
    "Fail to get booking",
  ).serial();

  return {
    result: r,
  };
}) satisfies PageLoad;
