import type { ProblemDetails } from "../../errors/problem_details";
import type {
  BookingCountRes,
  MaterializedCostRes,
  SchedulePrincipalRes,
  TimingRes,
} from "$lib/api/core/data-contracts";
import { NewApi } from "../../store";
import { toResult } from "$lib/utility";
import type { PageLoad } from "./$types";
import { Res } from "$lib/core/result";
import type { Timings } from "./typing";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { redirect } from "@sveltejs/kit";
import { addMinutes, isAfter } from "date-fns";

function getTiming(
  direction: "JToW" | "WToJ",
  timings: TimingRes,
  schedule: SchedulePrincipalRes,
  after?: string,
): string[] {
  const excluded: string[] =
    (direction === "JToW" ? schedule.jToWExcluded : schedule.wToJExcluded) ??
    [];

  const t: string[] = timings.principal.timings ?? [];
  const f = t.filter((t) => !excluded.includes(t)) ?? [];
  if (after) {
    const b = addMinutes(new Date(`2024-01-01T${after}`), 16 * 60);
    return f.filter((t) => isAfter(new Date(`2024-01-01T${t}`), b));
  }
  return f;
}

function stitchTiming(timings: string[], res: BookingCountRes[]): Timings {
  return Object.fromEntries(
    timings.map((x) => [x, res.find((c) => c.time === x)?.ticketsNeeded ?? 0]),
  ) as { [s: string]: number };
}

export const load = (async ({
  parent,
  url,
}): Promise<{
  result: ["err", ProblemDetails[]] | ["ok", [Timings, MaterializedCostRes]];
}> => {
  const { session } = await parent();

  const api = NewApi({ data: { session } });

  const t = today(getLocalTimeZone());
  const [y, m, d] = t.toString().split("-");
  const date: string = url.searchParams.get("date") ?? "";
  const direction: string = url.searchParams.get("direction") ?? "";

  if (date === "" || direction === "") {
    const dd = date === "" ? `${d}-${m}-${y}` : date;
    const dir = direction === "" ? "WToJ" : direction;
    throw redirect(302, `/schedules?date=${dd}&direction=${dir}`);
  }

  const [dd, dm, dy] = date.split("-");

  const n = new CalendarDate(parseInt(dy), parseInt(dm), parseInt(dd));
  if (n.compare(t) < 0) {
    throw redirect(
      302,
      `/schedules?date=${d}-${m}-${y}&direction=${direction}`,
    );
  }

  const after =
    n.compare(t) === 0
      ? new Date().toLocaleTimeString(undefined, { hour12: false })
      : undefined;

  const schedule = toResult(
    () => api.vScheduleDetail(date, "1"),
    "Fail to get schedule",
  );

  const timing = toResult(
    () => api.vTimingDetail(direction, "1"),
    "Fail to get timing",
  );

  const counts = toResult(
    () => api.vBookingCountsDetail2(date, direction, "1"),
    "Failed to get counts",
  );

  const cost = toResult(() => api.vCostSelfDetail("1"), "Failed to get cost");

  const result = await Res.all(schedule, timing, cost, counts)
    .map(
      ([s, t, c, b]) =>
        [
          stitchTiming(getTiming(direction as "JToW" | "WToJ", t, s, after), b),
          c,
        ] as [Timings, MaterializedCostRes],
    )
    .serial();

  return { result };
}) satisfies PageLoad;
