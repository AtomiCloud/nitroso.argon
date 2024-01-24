import type { ProblemDetails } from "../../errors/problem_details";
import type {
  SchedulePrincipalRes,
  TimingRes,
} from "$lib/api/core/data-contracts";
import { NewApi } from "../../store";
import { toResult } from "$lib/utility";
import type { PageLoad } from "./$types";
import { Res } from "$lib/core/result";

function getTiming(
  direction: "JToW" | "WToJ",
  timings: TimingRes,
  schedule: SchedulePrincipalRes,
): string[] {
  const excluded: string[] =
    (direction === "JToW" ? schedule.jToWExcluded : schedule.wToJExcluded) ??
    [];
  const t: string[] = timings.principal.timings ?? [];
  return t.filter((t) => !excluded.includes(t)) ?? [];
}

export const load = (async ({
  parent,
  url,
}): Promise<{
  result: ["err", ProblemDetails[]] | ["ok", string[]];
}> => {
  const { session } = await parent();

  const api = NewApi({ data: { session } });

  const date: string = url.searchParams.get("date") ?? "";
  const direction: string = url.searchParams.get("direction") ?? "";

  const schedule = toResult(
    () => api.vScheduleDetail(date, "1"),
    "Fail to get schedule",
  );

  const timing = toResult(
    () => api.vTimingDetail(direction, "1"),
    "Fail to get timing",
  );

  const r = await Res.all(schedule, timing)
    .map(([schedule, timing]) =>
      getTiming(direction as "JToW" | "WToJ", timing, schedule),
    )
    .serial();

  return {
    result: r,
  };
}) satisfies PageLoad;
