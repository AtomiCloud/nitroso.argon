<script lang="ts">
    import {onMount, tick} from "svelte";
    import {page} from "$app/stores";
    import {goto} from "$app/navigation";
    import {api} from "../../store";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";

    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    //@ts-ignore
    import * as Tabs from "$lib/components/ui/tabs";

    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Button} from "$lib/components/ui/button";
    import {cn} from "$lib/utils";
    import type {Selected} from "bits-ui";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import {singaporeToday} from "$lib/time/singapore";
    import {CalendarIcon, Clock, CalendarDays, ArrowLeftRight, Flag, Hourglass, LucideLoader, RotateCw, Timer, Users, Zap} from "lucide-svelte";
    import type {BookingStatRes, MilestonePrincipalRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import Loader from "$lib/components/complex/loader.svelte";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatNumber} from "$lib/i18n";
    import {
        DAYS, DIRECTIONS, DIR_DOT, DIR_TINT, BUCKETS, DEMAND_BUCKETS, DELIVERY_BUCKETS, DELIVERY_CUTOFFS,
        aggregate, rateOf, rateClass, barClass, rateText, toStatRow,
        type StatRow,
    } from "./stats";
    import {
        QUARTERS,
        TRAVEL_DIRECTIONS,
        cellCount,
        isTravelDirection,
        parseTravelDate,
        pivotTravelAnalysis,
        rowTotal,
        type TravelDirectionFilter,
        type TravelDayRow,
    } from "./travel-stats";
    import StatTable from "./StatTable.svelte";
    import MilestoneManage from "./MilestoneManage.svelte";

    // Admin-only booking statistics (same server-side gating as /fees — zinc
    // rejects non-admin reads and the nav link is only rendered for admins).
    // ONE call to GET Booking/stats per travel-date range; every other filter
    // and the success-rate definition toggle are pure client-side
    // re-aggregations of the returned rows, which zinc pre-groups by
    // (dayOfWeek, time, direction, lead-time bucket, priority, demandBucket,
    // deliveryBucket).
    //
    // Mobile-first (owner mandate — this page is mostly used on phones):
    // 24h clock only ("17:00", shorter than locale AM/PM), short day names
    // ("Mon"), compact cell padding, a compact filter bar whose rows
    // scroll horizontally inside themselves, and direction shown purely by
    // COLOR (blue = W → JB, purple = JB → W) with one legend at the top —
    // direction text appears only in that legend and the direction filter.
    //
    // The page is TABS over ONE shared filtered slice: Overview, Day × Time,
    // Lead time, Demand, Delivery lead — the global bar filters ALL tabs.
    // The active tab and every global filter are mirrored into the URL query
    // string (see the "URL-encoded view state" section) so back / refresh /
    // share reproduce the exact view.

    // milestone create/delete is admin-only on zinc; the list is authed for
    // everyone, so non-admins still get the "From milestone" select
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: session = $page.data.session as any;
    $: isAdmin = session?.roles?.includes("admin") ?? false;

    // 24h wall-clock text from zinc's HH:mm:ss
    function hhmm(t: string | null | undefined): string {
        return (t ?? "").slice(0, 5);
    }

    // ---- travel-date range ----
    // zinc's standard API date format, dd-MM-yyyy — CalendarDate.toString()
    // is ISO and gets rejected with a 400
    function toApiDate(d: DateValue): string {
        const dd = String(d.day).padStart(2, "0");
        const mm = String(d.month).padStart(2, "0");
        return `${dd}-${mm}-${d.year}`;
    }

    function fromApiDate(s: string | null | undefined): DateValue | null {
        const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s ?? "");
        return m ? new CalendarDate(Number(m[3]), Number(m[2]), Number(m[1])) : null;
    }

    // seed with the 90-day fallback; onMount swaps the start to the latest
    // milestone date when one exists. "Today" is Singapore's calendar day —
    // travel dates are SGT, so a browser in another timezone must not shift
    // the window by a day around local midnight.
    const today = singaporeToday();
    let after: DateValue | undefined = today.subtract({days: 90});
    let before: DateValue | undefined = today;

    let rows: BookingStatRes[] = [];
    let loading = false;
    let failed = false;

    async function load() {
        loading = true;
        await toResult(() => $api.vBookingStatsDetail("1", {
            ...(after == null ? {} : {after: toApiDate(after)}),
            ...(before == null ? {} : {before: toApiDate(before)}),
        }), $_('stats.loadError', { locale: $lang })).match({
            ok: (r: BookingStatRes[]) => {
                rows = r;
                failed = false;
            },
            err: (e) => {
                console.error(e);
                failed = true;
            }
        });
        loading = false;
    }

    // ---- milestones (range-start presets; newest date first from zinc) ----
    let milestones: MilestonePrincipalRes[] = [];
    let selMilestone: Selected<string> | undefined;

    function milestoneLabel(m: MilestonePrincipalRes): string {
        return `${m.label} · ${m.date}`;
    }

    async function loadMilestones() {
        await toResult(() => $api.vMilestoneList("1"),
            $_('stats.milestone.loadFailed', { locale: $lang })).match({
            ok: (r: MilestonePrincipalRes[]) => {
                milestones = r;
            },
            err: (e) => {
                // non-fatal: keep the 90-day fallback range
                console.error(e);
            }
        });
    }

    function latestMilestone(): MilestonePrincipalRes | undefined {
        // zinc returns newest date first, but derive defensively
        let best: MilestonePrincipalRes | undefined;
        let bestD: DateValue | null = null;
        for (const m of milestones) {
            const d = fromApiDate(m.date);
            if (d == null) continue;
            if (bestD == null || d.compare(bestD) > 0) {
                best = m;
                bestD = d;
            }
        }
        return best;
    }

    onMount(async () => {
        await loadMilestones();
        const latest = latestMilestone();
        const d = latest == null ? null : fromApiDate(latest.date);
        // default range start = the LATEST milestone date (fallback: the
        // seeded last-90-days start); never start the range after its end
        if (latest != null && d != null && before != null && d.compare(before) <= 0) {
            after = d;
            selMilestone = {value: latest.id, label: milestoneLabel(latest)};
        }
        // the URL omits params at their default, so capture the resolved
        // defaults before seeding the view from the query string
        defAfterStr = after == null ? "" : toApiDate(after);
        defBeforeStr = before == null ? "" : toApiDate(before);
        applyUrl($page.url.searchParams);
        urlReady = true;
        await load();
        // the travel-date section is independent of the main stats range;
        // load it in parallel so a slow zinc doesn't block the page above
        loadTravel();
    });

    // picking a milestone snaps the range start to its date; the calendar
    // popover can still override afterwards
    function milestonePick(s: Selected<string> | undefined) {
        const m = milestones.find(x => x.id === s?.value);
        const d = fromApiDate(m?.date);
        if (d != null) {
            after = d;
            load();
        }
    }

    // after admin create/delete: refresh the list and drop a stale selection
    async function refreshMilestones() {
        await loadMilestones();
        const sel = selMilestone;
        if (sel?.value && !milestones.some(m => m.id === sel.value)) selMilestone = undefined;
    }

    async function rangeChange() {
        await tick();
        // a manual calendar override invalidates the milestone preset label
        const sel = selMilestone;
        if (sel?.value) {
            const m = milestones.find(x => x.id === sel.value);
            if (after == null || m?.date !== toApiDate(after)) selMilestone = undefined;
        }
        load();
    }

    // ---- success-rate definition toggle ----
    // "refund":       success = completed / (completed + refunded)
    // "refundCancel": success = completed / (completed + refunded + cancelled)
    let definition = "refund";
    // ToggleGroup single allows deselecting; never leave the page undefined
    $: if (!definition) definition = "refund";

    // ---- bucket aggregation mode (lead-time AND delivery ladders) ----
    // "per": each bucket stands alone (a la carte)
    // "le":  cumulative ≤ — each bucket row aggregates ALL rows at or under
    //        that bucket ("within X of departure")
    // "ge":  cumulative ≥ — each bucket row aggregates ALL rows at or over
    //        that bucket ("at least X before departure")
    // A bucket FILTER follows the same semantics, so it feeds every tab
    // consistently. ≤ and ≥ tell different stories — both exist.
    let bucketMode = "per";
    // ToggleGroup single allows deselecting; never leave the mode undefined
    $: if (!bucketMode) bucketMode = "per";

    function bucketIdx(bk: string | null | undefined): number {
        return BUCKETS.indexOf(bk ?? "");
    }

    // ---- client-side filters over the pre-grouped rows ----
    let selDay: Selected<string> | undefined;
    let selDirection: Selected<string> | undefined;
    let selTime: Selected<string> | undefined;
    let selBucket: Selected<string> | undefined;
    let selPriority: Selected<string> | undefined;
    let selDemand: Selected<string> | undefined;
    // NOT a row filter: the delivery cutoff REDEFINES success (see below)
    let selDelivery: Selected<string> | undefined;

    // Keep closed-trigger labels in the active locale (same treatment as the
    // bookings list selects).
    $: if (selDay?.value) {
        const l = $_(`stats.daysShort.${selDay.value.toLowerCase()}`, { locale: $lang });
        if (selDay.label !== l) selDay = { ...selDay, label: l };
    }
    $: if (selDirection?.value) {
        const l = $_(selDirection.value === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang });
        if (selDirection.label !== l) selDirection = { ...selDirection, label: l };
    }
    $: if (selTime?.value) {
        const l = hhmm(selTime.value);
        if (selTime.label !== l) selTime = { ...selTime, label: l };
    }
    // The bucket trigger mirrors the active mode's semantics ("24h" / "≤ 24h"
    // / "≥ 24h") so the filter never reads ambiguously.
    $: if (selBucket?.value) {
        const l = bucketLabel(selBucket.value, bucketMode, $lang);
        if (selBucket.label !== l) selBucket = { ...selBucket, label: l };
    }
    $: if (selPriority?.value) {
        const l = $_(`stats.priority.${selPriority.value}`, { locale: $lang });
        if (selPriority.label !== l) selPriority = { ...selPriority, label: l };
    }
    // The demand trigger follows the same mode-aware labeling as lead time
    // ("10-20" / "≤ 10-20" / "≥ 10-20").
    $: if (selDemand?.value) {
        const l = bucketLabel(selDemand.value, bucketMode, $lang);
        if (selDemand.label !== l) selDemand = { ...selDemand, label: l };
    }
    $: if (selDelivery?.value) {
        const l = $_('stats.deliveryCutoff.optionLabel', { locale: $lang, values: { bucket: selDelivery.value } });
        if (selDelivery.label !== l) selDelivery = { ...selDelivery, label: l };
    }

    function bucketLabel(bk: string, mode: string, l: typeof $lang): string {
        if (mode === "le") return $_('stats.bucketMode.upTo', { locale: l, values: { bucket: bk } });
        if (mode === "ge") return $_('stats.bucketMode.atLeast', { locale: l, values: { bucket: bk } });
        return bk;
    }

    // Departure-time options come from the data itself, scoped to the selected
    // direction — a direction only serves its own timetable, so the select
    // must never offer the other direction's times.
    $: timesInData = [...new Set(rows
        .filter(r => !selDirection?.value || r.direction === selDirection.value)
        .map(r => r.time ?? ""))].filter(t => t !== "").sort();
    // Drop a stale time filter when a direction switch removes that slot.
    // Gated on !loading AND rows existing: during a refetch (back/forward
    // range move, reload) `rows` still holds the PREVIOUS range's data, so a
    // URL-seeded time absent from the old rows must not be judged — clearing
    // it here would also ripple into syncUrl and rewrite the just-restored
    // history entry. Judge only against settled data.
    $: if (!loading && rows.length > 0 && selTime?.value && !timesInData.includes(selTime.value)) selTime = undefined;
    // Bucket options limited to buckets actually present, in canonical order
    $: bucketsInData = BUCKETS.filter(bk => rows.some(r => r.bucket === bk));
    $: demandInData = DEMAND_BUCKETS.filter(db => rows.some(r => r.demandBucket === db));

    function bucketMatches(r: BookingStatRes, sel: string, mode: string): boolean {
        if (mode === "per") return r.bucket === sel;
        const i = bucketIdx(r.bucket);
        if (i === -1) return false;
        return mode === "ge" ? i >= bucketIdx(sel) : i <= bucketIdx(sel);
    }

    // The demand filter follows the SAME 3-mode semantics as lead time:
    // per = exactly that bucket, ≤/≥ = cumulative over the demand ladder
    // (e.g. mode ≥ + "10-20" = every row with demand at 10-20 or above).
    function demandFilterMatches(r: BookingStatRes, sel: string, mode: string): boolean {
        if (mode === "per") return r.demandBucket === sel;
        const i = DEMAND_BUCKETS.indexOf(r.demandBucket ?? "");
        if (i === -1) return false;
        const s = DEMAND_BUCKETS.indexOf(sel);
        return mode === "ge" ? i >= s : i <= s;
    }

    // the ONE filtered slice every tab reads. The delivery cutoff is
    // deliberately NOT here: it never drops rows, it redefines which
    // completions count as success (see dlvCutoff below).
    $: filtered = rows.filter(r =>
        (!selDay?.value || r.dayOfWeek === selDay.value) &&
        (!selDirection?.value || r.direction === selDirection.value) &&
        (!selTime?.value || r.time === selTime.value) &&
        (!selPriority?.value || (selPriority.value === "priority" ? r.priority : !r.priority)) &&
        (!selBucket?.value || bucketMatches(r, selBucket.value, bucketMode)) &&
        (!selDemand?.value || demandFilterMatches(r, selDemand.value, bucketMode)));

    // ---- delivery-lead SUCCESS REDEFINITION ("" = off) ----
    // With a cutoff active, a completed booking whose ticket arrived closer
    // to departure than the cutoff counts as a FAILURE: the numerator shrinks
    // to timely completions, the denominator is untouched. Completed rows
    // without a deliveryBucket (legacy/unbucketed) cannot be verified as
    // timely, so they count as fail too — the InfoTip says so.
    $: dlvCutoff = selDelivery?.value ?? "";

    // ---- breakdown tables (Group | Total | Success % + raw n/d) ----

    // breakdown by day of week (Mon → Sun)
    $: byDay = DAYS
        .map(d => ({key: d, rs: filtered.filter(r => r.dayOfWeek === d)}))
        .filter(g => g.rs.length > 0)
        .map(g => toStatRow(g.key, $_(`stats.daysShort.${g.key.toLowerCase()}`, { locale: $lang }), "", g.rs, definition, dlvCutoff));

    // breakdown by departure time, one tinted row per (direction, time)
    $: byTime = [...new Set(filtered.map(r => `${r.direction ?? ""}|${r.time ?? ""}`))]
        .sort()
        .map(k => {
            const [dir, tm] = k.split("|");
            const rs = filtered.filter(r => (r.direction ?? "") === dir && (r.time ?? "") === tm);
            return toStatRow(k, tm === "" ? "—" : hhmm(tm), dir, rs, definition, dlvCutoff);
        });

    // breakdown by lead-time bucket (6h → 6m+); the cumulative modes turn
    // each row into a running total: ≤ over everything at-or-under the
    // bucket, ≥ over everything at-or-over it
    $: presentBuckets = BUCKETS.filter(bk => filtered.some(r => r.bucket === bk));
    $: byBucket = presentBuckets.map(bk => toStatRow(
        bk,
        bucketLabel(bk, bucketMode, $lang),
        "",
        filtered.filter(r => bucketMatches(r, bk, bucketMode)),
        definition,
        dlvCutoff));

    // breakdown by demand — how many bookings competed for the slot
    $: byDemand = DEMAND_BUCKETS
        .map(db => ({key: db, rs: filtered.filter(r => r.demandBucket === db)}))
        .filter(g => g.rs.length > 0)
        .map(g => toStatRow(g.key, g.key, "", g.rs, definition, dlvCutoff)) as StatRow[];

    // ---- delivery lead (COMPLETED bookings only; deliveryBucket != null) ----
    // distribution of how long before departure the ticket was secured; the
    // 3-mode toggle applies here too (per / cumulative ≤ / cumulative ≥)
    type DeliveryRow = { key: string; label: string; count: number; share: number | null };

    function deliveryIdx(db: string | null | undefined): number {
        return DELIVERY_BUCKETS.indexOf(db ?? "");
    }

    function deliveryMatches(r: BookingStatRes, sel: string, mode: string): boolean {
        if (r.deliveryBucket == null) return false;
        if (mode === "per") return r.deliveryBucket === sel;
        const i = deliveryIdx(r.deliveryBucket);
        if (i === -1) return false;
        return mode === "ge" ? i >= deliveryIdx(sel) : i <= deliveryIdx(sel);
    }

    $: deliveredTotal = filtered.filter(r => r.deliveryBucket != null)
        .reduce((s, r) => s + r.completed, 0);
    $: byDelivery = DELIVERY_BUCKETS
        .filter(db => filtered.some(r => r.deliveryBucket === db))
        .map((db): DeliveryRow => {
            const count = filtered.filter(r => deliveryMatches(r, db, bucketMode))
                .reduce((s, r) => s + r.completed, 0);
            return {
                key: db,
                label: bucketLabel(db, bucketMode, $lang),
                count,
                share: deliveredTotal === 0 ? null : (count / deliveredTotal) * 100,
            };
        });

    // ---- 2D matrix: day-of-week × time-of-day (transposed for mobile) ----
    // Each departure time belongs to exactly ONE direction (the J→W and W→J
    // timetables are disjoint), so a (day, time) cell holds a single value —
    // the direction is conveyed by tinting the whole timeslot row (see page
    // legend) while the cell TEXT keeps the green/amber/red rate coloring.
    type MatrixCell = { rate: number | null; total: number };

    $: matrixTimes = [...new Set(filtered.map(r => r.time ?? ""))].filter(t => t !== "").sort();
    $: matrixDays = DAYS.filter(d => filtered.some(r => r.dayOfWeek === d));
    $: matrix = buildMatrix(filtered, definition, dlvCutoff);
    // each time's direction, derived from the data rows (for row tinting)
    $: timeDirection = deriveTimeDirection(rows);

    function deriveTimeDirection(rs: BookingStatRes[]): Map<string, string> {
        const m = new Map<string, string>();
        for (const r of rs) {
            if (!r.time || !r.direction) continue;
            if (!m.has(r.time)) m.set(r.time, r.direction);
        }
        return m;
    }

    function buildMatrix(rs: BookingStatRes[], def: string, cutoff: string): Map<string, MatrixCell> {
        // group the (already bucket/filter-sliced) rows per (day, time)
        const groups = new Map<string, BookingStatRes[]>();
        for (const r of rs) {
            if (!r.dayOfWeek || !r.time) continue;
            const key = `${r.dayOfWeek}|${r.time}`;
            const g = groups.get(key);
            if (g == null) groups.set(key, [r]);
            else g.push(r);
        }
        const m = new Map<string, MatrixCell>();
        for (const [key, g] of groups) {
            const a = aggregate(g, cutoff);
            m.set(key, {rate: rateOf(a, def), total: a.total});
        }
        return m;
    }

    // summary of the current filtered slice, under both definitions, with the
    // raw numerators/denominators visible (the owner's actuarial base)
    $: summary = aggregate(filtered, dlvCutoff);
    $: summaryRateRefund = rateOf(summary, "refund");
    $: summaryRateRefundCancel = rateOf(summary, "refundCancel");
    $: summaryDenRefund = summary.completed + summary.refunded;
    $: summaryDenRefundCancel = summary.completed + summary.refunded + summary.cancelled;

    // ---- tabs over the one shared slice ----
    let tab = "overview";
    // "demand" was called "queueDepth" before the rename; applyUrl still
    // accepts the old value so shared/bookmarked URLs keep working
    const TABS = ["overview", "matrix", "leadTime", "demand", "delivery"];

    // ---- URL-encoded view state ----
    // The active tab and EVERY global control are mirrored into the query
    // string so back / refresh / share reproduce the exact view:
    //   tab      active tab (matrix | leadTime | demand | delivery;
    //            queueDepth is accepted as a legacy alias for demand)
    //   from/to  travel-date range in dd-MM-yyyy (zinc's API date format —
    //            it round-trips losslessly through toApiDate/fromApiDate);
    //            when present they OVERRIDE the milestone-derived default
    //   dir      direction filter (WToJ | JToW)
    //   day      day-of-week filter (Monday … Sunday)
    //   time     departure-time filter (HH:mm or HH:mm:ss)
    //   bucket   lead-time bucket filter (6h … 6m+)
    //   demand   demand bucket filter (0-5 … 30+); follows `mode` like bucket
    //   dlv      delivery-lead success cutoff (2h … 48h+) — NOT a row filter,
    //            it redefines the success numerator (see dlvCutoff)
    //   priority priority filter (priority | regular)
    //   def      success definition (refundCancel; refund is the default)
    //   mode     bucket aggregation mode (le | ge; per is the default)
    // Params at their default are OMITTED, so the default view is a clean
    // /stats. Tab switches PUSH history entries (browser Back walks the tab
    // trail); filter changes replace the current entry. Unknown or garbage
    // values fall back to the default silently.

    // resolved range defaults ("" = unset), captured in onMount AFTER the
    // milestone default is applied but BEFORE the URL seeds the state
    let defAfterStr = "";
    let defBeforeStr = "";
    // no URL writes until the initial seed is done (never navigate during
    // hydration); lastTab distinguishes tab switches (push) from filters
    let urlReady = false;
    let lastTab = tab;

    function pickParam(v: string | null, allowed: string[]): string {
        return v != null && allowed.includes(v) ? v : "";
    }

    // minimal Selected<> shell; the locale reactives above rewrite the label
    function selOf(v: string): Selected<string> | undefined {
        return v === "" ? undefined : {value: v, label: v};
    }

    // dd-MM-yyyy from the URL. CalendarDate is lenient (31-02 silently
    // constructs), so validate by round-tripping through the real calendar:
    // an impossible day-of-month normalizes to a different date and fails the
    // comparison. Anything invalid is ignored.
    function urlDate(s: string | null): DateValue | null {
        const d = fromApiDate(s);
        if (d == null || d.month < 1 || d.month > 12 || d.day < 1) return null;
        const normalized = new CalendarDate(d.year, d.month, 1).add({days: d.day - 1});
        return normalized.compare(d) === 0 && normalized.day === d.day ? d : null;
    }

    // HH:mm or HH:mm:ss from the URL, normalized to zinc's HH:mm:ss rows
    function urlTime(v: string | null): string {
        const m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(v ?? "");
        return m ? `${m[1]}:${m[2]}:${m[3] ?? "00"}` : "";
    }

    // seed the whole view state from the query params
    function applyUrl(q: URLSearchParams) {
        // legacy alias from before the "Queue depth" → "Demand" rename
        const rawTab = q.get("tab") === "queueDepth" ? "demand" : q.get("tab");
        tab = pickParam(rawTab, TABS) || "overview";
        lastTab = tab;
        after = urlDate(q.get("from")) ?? fromApiDate(defAfterStr) ?? undefined;
        before = urlDate(q.get("to")) ?? fromApiDate(defBeforeStr) ?? undefined;
        // the milestone select is a label over the range start: re-derive it
        // so a URL whose "from" IS a milestone date shows that preset
        const a = after;
        const ms = a == null ? undefined : milestones.find(m => m.date === toApiDate(a));
        selMilestone = ms == null ? undefined : {value: ms.id, label: milestoneLabel(ms)};
        selDirection = selOf(pickParam(q.get("dir"), DIRECTIONS));
        selDay = selOf(pickParam(q.get("day"), DAYS));
        selTime = selOf(urlTime(q.get("time")));
        selBucket = selOf(pickParam(q.get("bucket"), BUCKETS));
        selDemand = selOf(pickParam(q.get("demand"), DEMAND_BUCKETS));
        selDelivery = selOf(pickParam(q.get("dlv"), DELIVERY_CUTOFFS));
        selPriority = selOf(pickParam(q.get("priority"), ["priority", "regular"]));
        definition = pickParam(q.get("def"), ["refund", "refundCancel"]) || "refund";
        bucketMode = pickParam(q.get("mode"), ["per", "le", "ge"]) || "per";
    }

    // current view state → canonical query string, defaults omitted
    function serializeUrl(): string {
        const q = new URLSearchParams();
        if (tab !== "overview") q.set("tab", tab);
        const a = after == null ? "" : toApiDate(after);
        const b = before == null ? "" : toApiDate(before);
        if (a && a !== defAfterStr) q.set("from", a);
        if (b && b !== defBeforeStr) q.set("to", b);
        if (selDirection?.value) q.set("dir", selDirection.value);
        if (selDay?.value) q.set("day", selDay.value);
        if (selTime?.value) q.set("time", selTime.value);
        if (selBucket?.value) q.set("bucket", selBucket.value);
        if (selDemand?.value) q.set("demand", selDemand.value);
        if (selDelivery?.value) q.set("dlv", selDelivery.value);
        if (selPriority?.value) q.set("priority", selPriority.value);
        if (definition !== "refund") q.set("def", definition);
        if (bucketMode !== "per") q.set("mode", bucketMode);
        return q.toString();
    }

    // state → URL. Only navigates when the serialized query actually differs
    // from the address bar (loop guard — our own goto lands right back here).
    $: if (urlReady) syncUrl(tab, after, before, selDirection, selDay, selTime,
        selBucket, selDemand, selDelivery, selPriority, definition, bucketMode);

    function syncUrl(..._deps: unknown[]) {
        const search = serializeUrl();
        const push = tab !== lastTab;
        lastTab = tab;
        if (search === $page.url.searchParams.toString()) return;
        goto(`${$page.url.pathname}${search ? `?${search}` : ""}`,
            {replaceState: !push, keepFocus: true, noScroll: true});
    }

    // URL → state (browser back/forward): re-seed when navigation changes the
    // query underneath us, refetching only if the travel-date range moved
    $: if (urlReady) onUrlChange($page.url);

    function onUrlChange(u: URL) {
        if (u.searchParams.toString() === serializeUrl()) return;
        const prevA = after == null ? "" : toApiDate(after);
        const prevB = before == null ? "" : toApiDate(before);
        applyUrl(u.searchParams);
        const nextA = after == null ? "" : toApiDate(after);
        const nextB = before == null ? "" : toApiDate(before);
        if (nextA !== prevA || nextB !== prevB) load();
    }

    // ---- Secured By Travel Date section (its own date range + direction
    // filter; independent from the main /stats range above because it answers
    // a DIFFERENT question — completion-date vs travel-date) ----
    // default range = today → today + 30 days (future travel is the
    // interesting view: "how many tickets have been secured for upcoming
    // travel dates, and in which quarter of the day?")
    const todaySgt = singaporeToday();
    let travelAfter: DateValue | undefined = todaySgt;
    let travelBefore: DateValue | undefined = todaySgt.add({days: 30});
    let travelDirection: TravelDirectionFilter = "";
    let travelRows: TravelDayRow[] = [];
    let travelLoading = false;
    // when zinc predates the travel-analysis endpoint, the fetch 404s and we
    // hide the whole section so the rest of the page still works
    let travelUnsupported = false;

    function travelRangeQuery(): { After?: string; Before?: string } {
        return {
            ...(travelAfter == null ? {} : {After: toApiDate(travelAfter)}),
            ...(travelBefore == null ? {} : {Before: toApiDate(travelBefore)}),
        };
    }

    async function loadTravel() {
        travelLoading = true;
        await toResult(() => $api.vBookingAnalysisTravelDetail("1", travelRangeQuery()),
            $_('stats.travelDate.loadError', { locale: $lang })).match({
            ok: (r) => {
                travelRows = pivotTravelAnalysis(r);
                travelUnsupported = false;
            },
            err: (e) => {
                // older zinc returns 404; degrade gracefully — the main
                // /stats view keeps working, this section just stays hidden
                if (e.status === 404) {
                    console.error("travel-date analysis: endpoint unavailable on zinc");
                    travelUnsupported = true;
                } else {
                    console.error(e);
                }
            }
        });
        travelLoading = false;
    }

    async function travelRangeChange() {
        await tick();
        loadTravel();
    }

    function setTravelDirection(v: string) {
        travelDirection = isTravelDirection(v) ? v : "";
    }

    // localized date label for the row's travel date (e.g. "15 Jul 2026");
    // falls back to the wire string when the date can't be parsed
    function travelDateLabel(ddMMyyyy: string): string {
        const d = parseTravelDate(ddMMyyyy);
        return d == null
            ? ddMMyyyy
            : formatCalendarDate(d, $lang, {day: "numeric", month: "short", year: "numeric"});
    }

    // grand total across all rendered rows under the active direction filter
    $: travelGrandTotal = travelRows.reduce((s, r) => s + rowTotal(r, travelDirection), 0);
</script>

<div class="flex flex-col">
    <div class="border-b bg-muted">
        <div class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1200px] w-11/12 mx-auto">
            <div class="text-3xl lg:text-4xl">
                {$_('stats.title', { locale: $lang })}
            </div>
            <Button variant="outline" disabled={loading} on:click={load}>
                {#if loading}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {:else}
                    <RotateCw class="mr-2 h-4 w-4"/>
                {/if}
                {$_('stats.reload', { locale: $lang })}
            </Button>
        </div>
    </div>
    <div class="flex flex-col gap-4 w-full px-2 sm:px-0 sm:w-11/12 max-w-[1200px] mx-auto my-4 sm:my-8">

        <!-- the ONE direction color legend for the whole page: every table row
             and matrix sub-cell uses these tints instead of direction text -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            {#each DIRECTIONS as d (d)}
                <span class="flex items-center gap-1.5">
                    <span class="inline-block h-2.5 w-2.5 rounded-full {DIR_DOT[d]}"></span>
                    <span class="text-muted-foreground">{$_(d === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}</span>
                </span>
            {/each}
        </div>

        <!-- GLOBAL filter bar: one shared state that narrows EVERY tab.
             A static compact block (full-bleed on mobile); every group WRAPS
             (no horizontal scrolling anywhere on the page except inside
             tables) -->
        <div class="-mx-2 px-2 py-2 sm:mx-0 sm:px-3 bg-background border-y sm:border sm:rounded-lg flex flex-col gap-2">

            <!-- group 1: travel-date range (the only thing that refetches
                 from zinc) + milestone preset + admin milestone management -->
            <div class="flex flex-wrap gap-2 items-center">
                    <Popover.Root>
                        <Popover.Trigger asChild let:builder>
                            <Button variant="outline"
                                    class={cn("h-8 px-2 text-xs justify-start font-normal shrink-0", !after && "text-muted-foreground")}
                                    builders={[builder]}>
                                <CalendarIcon class="mr-1.5 h-3.5 w-3.5"/>
                                {after ? formatCalendarDate(after.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('stats.range.after', { locale: $lang })}
                            </Button>
                        </Popover.Trigger>
                        <Popover.Content class="w-auto p-0" align="start">
                            <Calendar bind:value={after} onValueChange={rangeChange}/>
                        </Popover.Content>
                    </Popover.Root>
                    <span class="text-muted-foreground text-xs">→</span>
                    <Popover.Root>
                        <Popover.Trigger asChild let:builder>
                            <Button variant="outline"
                                    class={cn("h-8 px-2 text-xs justify-start font-normal shrink-0", !before && "text-muted-foreground")}
                                    builders={[builder]}>
                                <CalendarIcon class="mr-1.5 h-3.5 w-3.5"/>
                                {before ? formatCalendarDate(before.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('stats.range.before', { locale: $lang })}
                            </Button>
                        </Popover.Trigger>
                        <Popover.Content class="w-auto p-0" align="start">
                            <Calendar bind:value={before} onValueChange={rangeChange}/>
                        </Popover.Content>
                    </Popover.Root>
                    <Select.Root bind:selected={selMilestone} onSelectedChange={milestonePick}>
                        <Select.Trigger class="h-8 w-48 text-xs shrink-0">
                            <Flag class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('stats.milestone.select', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            {#if milestones.length === 0}
                                <div class="px-2 py-1.5 text-xs text-muted-foreground">{$_('stats.milestone.empty', { locale: $lang })}</div>
                            {/if}
                            {#each milestones as m (m.id)}
                                <Select.Item value={m.id}>{milestoneLabel(m)}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                {#if isAdmin}
                    <MilestoneManage {milestones} {toApiDate} reload={refreshMilestones}/>
                {/if}
            </div>

            <!-- group 2: slice filters (pure client-side re-aggregation)
                 + the delivery-lead success cutoff -->
            <div class="flex flex-wrap gap-2 items-center">
                    <Select.Root bind:selected={selDirection}>
                        <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                            <ArrowLeftRight class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.direction', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each DIRECTIONS as d}
                                <Select.Item value={d}>
                                    <span class="inline-block h-2 w-2 rounded-full mr-2 {DIR_DOT[d]}"></span>
                                    {$_(d === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}
                                </Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selDay}>
                        <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                            <CalendarDays class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.day', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each DAYS as d}
                                <Select.Item value={d}>{$_(`stats.daysShort.${d.toLowerCase()}`, { locale: $lang })}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selTime}>
                        <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                            <Clock class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.time', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each timesInData as t}
                                <Select.Item value={t}>{hhmm(t)}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selBucket}>
                        <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                            <Hourglass class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.bucket', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each bucketsInData as bk}
                                <Select.Item value={bk}>{bk}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selPriority}>
                        <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                            <Zap class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.priority', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            <Select.Item value="priority">{$_('stats.priority.priority', { locale: $lang })}</Select.Item>
                            <Select.Item value="regular">{$_('stats.priority.regular', { locale: $lang })}</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    <Select.Root bind:selected={selDemand}>
                        <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                            <Users class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                            <Select.Value placeholder={$_('stats.filters.demand', { locale: $lang })}/>
                        </Select.Trigger>
                        <Select.Content>
                            <Select.Item value="">{$_('stats.filters.all', { locale: $lang })}</Select.Item>
                            {#each demandInData as db}
                                <Select.Item value={db}>{db}</Select.Item>
                            {/each}
                        </Select.Content>
                    </Select.Root>
                    <span class="flex items-center gap-0.5">
                        <!-- delivery cutoff: NOT a row filter — it redefines
                             success, so it gets its own InfoTip -->
                        <Select.Root bind:selected={selDelivery}>
                            <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                                <Timer class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                                <Select.Value placeholder={$_('stats.deliveryCutoff.placeholder', { locale: $lang })}/>
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="">{$_('stats.deliveryCutoff.off', { locale: $lang })}</Select.Item>
                                {#each DELIVERY_CUTOFFS as db}
                                    <Select.Item value={db}>{$_('stats.deliveryCutoff.optionLabel', { locale: $lang, values: { bucket: db } })}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        <InfoTip label={$_('stats.deliveryCutoff.placeholder', { locale: $lang })}>
                            {$_('stats.deliveryCutoff.info', { locale: $lang })}
                        </InfoTip>
                    </span>
            </div>

            <!-- group 3: success definition + bucket aggregation mode (the
                 long help sentences live in InfoTips to keep the filter bar
                 short). Two toggle groups STACK on phones (each wraps by
                 itself) and share a row from sm: up — nothing scrolls
                 horizontally -->
            <div class="flex flex-col gap-2 items-start sm:flex-row sm:items-center">
                    <span class="flex flex-wrap gap-2 items-center">
                        <ToggleGroup.Root type="single" bind:value={definition} class="justify-start">
                            <ToggleGroup.Item value="refund" class="h-8 px-2 text-xs" aria-label={$_('stats.definition.refundOnly', { locale: $lang })}>
                                {$_('stats.definition.refundOnly', { locale: $lang })}
                            </ToggleGroup.Item>
                            <ToggleGroup.Item value="refundCancel" class="h-8 px-2 text-xs" aria-label={$_('stats.definition.refundCancel', { locale: $lang })}>
                                {$_('stats.definition.refundCancel', { locale: $lang })}
                            </ToggleGroup.Item>
                        </ToggleGroup.Root>
                        <InfoTip label={$_('stats.definition.refundOnly', { locale: $lang })}>
                            {#if definition === "refundCancel"}
                                {$_('stats.definition.helpRefundCancel', { locale: $lang })}
                            {:else}
                                {$_('stats.definition.helpRefundOnly', { locale: $lang })}
                            {/if}
                        </InfoTip>
                    </span>
                    <span class="hidden sm:inline-block h-5 w-px bg-border"></span>
                    <span class="flex flex-wrap gap-2 items-center">
                        <ToggleGroup.Root type="single" bind:value={bucketMode} class="justify-start">
                            <ToggleGroup.Item value="per" class="h-8 px-2 text-xs" aria-label={$_('stats.bucketMode.per', { locale: $lang })}>
                                {$_('stats.bucketMode.per', { locale: $lang })}
                            </ToggleGroup.Item>
                            <ToggleGroup.Item value="le" class="h-8 px-2 text-xs" aria-label={$_('stats.bucketMode.cumulativeLe', { locale: $lang })}>
                                {$_('stats.bucketMode.cumulativeLe', { locale: $lang })}
                            </ToggleGroup.Item>
                            <ToggleGroup.Item value="ge" class="h-8 px-2 text-xs" aria-label={$_('stats.bucketMode.cumulativeGe', { locale: $lang })}>
                                {$_('stats.bucketMode.cumulativeGe', { locale: $lang })}
                            </ToggleGroup.Item>
                        </ToggleGroup.Root>
                        <InfoTip label={$_('stats.bucketMode.per', { locale: $lang })}>
                            {#if bucketMode === "le"}
                                {$_('stats.bucketMode.helpCumulativeLe', { locale: $lang })}
                            {:else if bucketMode === "ge"}
                                {$_('stats.bucketMode.helpCumulativeGe', { locale: $lang })}
                            {:else}
                                {$_('stats.bucketMode.helpPer', { locale: $lang })}
                            {/if}
                        </InfoTip>
                    </span>
            </div>
        </div>

        {#if failed}
            <div class="flex flex-col items-center gap-4 py-12">
                <p class="text-muted-foreground">{$_('stats.loadError', { locale: $lang })}</p>
                <Button variant="outline" disabled={loading} on:click={load}>
                    <RotateCw class="mr-2 h-4 w-4"/>
                    {$_('stats.reload', { locale: $lang })}
                </Button>
            </div>
        {:else if loading && rows.length === 0}
            <Loader/>
        {:else if rows.length === 0}
            <p class="text-center text-muted-foreground py-12">{$_('stats.empty', { locale: $lang })}</p>
        {:else}
            <Tabs.Root bind:value={tab}>
                <div class="overflow-x-auto">
                    <Tabs.List class="w-max h-9">
                        <Tabs.Trigger value="overview" class="text-xs sm:text-sm px-2.5">{$_('stats.tabs.overview', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="matrix" class="text-xs sm:text-sm px-2.5">{$_('stats.tabs.matrix', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="leadTime" class="text-xs sm:text-sm px-2.5">{$_('stats.tabs.leadTime', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="demand" class="text-xs sm:text-sm px-2.5">{$_('stats.tabs.demand', { locale: $lang })}</Tabs.Trigger>
                        <Tabs.Trigger value="delivery" class="text-xs sm:text-sm px-2.5">{$_('stats.tabs.delivery', { locale: $lang })}</Tabs.Trigger>
                    </Tabs.List>
                </div>

                <!-- 1. Overview: the filtered slice under both definitions,
                     raw numerators/denominators spelled out -->
                <Tabs.Content value="overview" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('stats.summary.title', { locale: $lang })}</Card.Title>
                        </Card.Header>
                        <Card.Content class="px-4 sm:px-6">
                            <div class="flex gap-x-8 gap-y-4 flex-wrap">
                                <div class="flex flex-col">
                                    <span class="text-sm text-muted-foreground">{$_('stats.summary.total', { locale: $lang })}</span>
                                    <span class="text-2xl font-semibold">{formatNumber(summary.total, $lang)}</span>
                                </div>
                                <!-- numerator = TIMELY completions (equals all
                                     completions unless a delivery cutoff is on) -->
                                <div class="flex flex-col">
                                    <span class="text-sm text-muted-foreground">{$_('stats.summary.successRefundOnly', { locale: $lang })}</span>
                                    <span class="text-2xl font-semibold {rateClass(summaryRateRefund)}">{rateText(summaryRateRefund, $lang)}</span>
                                    <span class="text-xs text-muted-foreground tabular-nums">{formatNumber(summary.timely, $lang)}/{formatNumber(summaryDenRefund, $lang)}</span>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-sm text-muted-foreground">{$_('stats.summary.successRefundCancel', { locale: $lang })}</span>
                                    <span class="text-2xl font-semibold {rateClass(summaryRateRefundCancel)}">{rateText(summaryRateRefundCancel, $lang)}</span>
                                    <span class="text-xs text-muted-foreground tabular-nums">{formatNumber(summary.timely, $lang)}/{formatNumber(summaryDenRefundCancel, $lang)}</span>
                                </div>
                            </div>
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>

                <!-- 2. Day × Time: the transposed matrix (timeslots as rows so
                     the many-item axis scrolls vertically on a phone; the 7
                     short day columns always fit) + the per-day and per-time
                     breakdown tables -->
                <Tabs.Content value="matrix" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title>{$_('stats.matrix.title', { locale: $lang })}</Card.Title>
                            <Card.Description>{$_('stats.matrix.description', { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if matrixDays.length === 0 || matrixTimes.length === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
                            {:else}
                                <!-- a row is one timeslot = exactly one direction,
                                     so the whole row carries its direction tint -->
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-8 px-2">{$_('stats.matrix.time', { locale: $lang })}</Table.Head>
                                                {#each matrixDays as d (d)}
                                                    <Table.Head class="h-8 px-1 text-center whitespace-nowrap">
                                                        {$_(`stats.daysShort.${d.toLowerCase()}`, { locale: $lang })}
                                                    </Table.Head>
                                                {/each}
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each matrixTimes as tm (tm)}
                                                <Table.Row class={DIR_TINT[timeDirection.get(tm) ?? ''] ?? ''}>
                                                    <Table.Cell class="px-2 py-1 font-medium whitespace-nowrap">{hhmm(tm)}</Table.Cell>
                                                    {#each matrixDays as d (d)}
                                                        {@const c = matrix.get(`${d}|${tm}`)}
                                                        <Table.Cell class="px-1 py-1 text-center text-xs">
                                                            {#if c != null && c.rate != null}
                                                                <span class="font-medium {rateClass(c.rate)}">{rateText(c.rate, $lang)}</span>
                                                            {:else}
                                                                <span class="text-muted-foreground/50 select-none">—</span>
                                                            {/if}
                                                        </Table.Cell>
                                                    {/each}
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                                <!-- rate color scale (direction colors: see page legend) -->
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 px-2 text-xs text-muted-foreground">
                                    <span class="font-medium text-green-600 dark:text-green-400">≥80%</span>
                                    <span class="font-medium text-amber-600 dark:text-amber-400">50–79%</span>
                                    <span class="font-medium text-red-600 dark:text-red-400">&lt;50%</span>
                                    <span>{$_('stats.matrix.rateLegend', { locale: $lang })}</span>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                    <StatTable title={$_('stats.table.byDay', { locale: $lang })} rows={byDay}/>
                    <StatTable title={$_('stats.table.byTime', { locale: $lang })} rows={byTime}/>
                </Tabs.Content>

                <!-- 3. Lead time: purchase → departure ladder, 3-mode toggle -->
                <Tabs.Content value="leadTime" class="flex flex-col gap-4">
                    <StatTable title={$_('stats.table.byBucket', { locale: $lang })} rows={byBucket}/>
                </Tabs.Content>

                <!-- 4. Demand: success rate by how contested the slot was -->
                <Tabs.Content value="demand" class="flex flex-col gap-4">
                    <StatTable title={$_('stats.queue.title', { locale: $lang })} rows={byDemand}>
                        <InfoTip slot="info" label={$_('stats.queue.title', { locale: $lang })}>
                            {$_('stats.queue.info', { locale: $lang })}
                        </InfoTip>
                    </StatTable>
                </Tabs.Content>

                <!-- 5. Delivery lead: COMPLETED bookings only — how long before
                     departure the ticket was secured (share of all completed
                     in the slice; ≤/≥ readings via the global mode toggle) -->
                <Tabs.Content value="delivery" class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <Card.Title class="flex items-center gap-2">
                                {$_('stats.delivery.title', { locale: $lang })}
                                <InfoTip label={$_('stats.delivery.title', { locale: $lang })}>
                                    {$_('stats.delivery.info', { locale: $lang })}
                                </InfoTip>
                            </Card.Title>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            {#if byDelivery.length === 0 || deliveredTotal === 0}
                                <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
                            {:else}
                                <div class="overflow-x-auto">
                                    <Table.Root>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head class="h-9 px-2">{$_('stats.delivery.bucket', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-9 px-2 text-right">{$_('stats.delivery.completed', { locale: $lang })}</Table.Head>
                                                <Table.Head class="h-9 px-2">{$_('stats.delivery.share', { locale: $lang })}</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each byDelivery as r (r.key)}
                                                <Table.Row>
                                                    <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{r.label}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5 text-right">{formatNumber(r.count, $lang)}</Table.Cell>
                                                    <Table.Cell class="px-2 py-1.5">
                                                        <div class="flex items-center gap-2 whitespace-nowrap">
                                                            <span class="w-12 sm:w-14 text-right font-medium">{r.share == null ? "—" : rateText(r.share, $lang)}</span>
                                                            <!-- a share of completions, not a success rate: neutral bar -->
                                                            <div class="h-1.5 w-12 sm:w-24 rounded bg-muted overflow-hidden">
                                                                {#if r.share != null}
                                                                    <div class="h-full bg-primary/60" style="width: {r.share}%"></div>
                                                                {/if}
                                                            </div>
                                                            <span class="text-[10px] text-muted-foreground tabular-nums">{formatNumber(r.count, $lang)}/{formatNumber(deliveredTotal, $lang)}</span>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            {/each}
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                </Tabs.Content>
            </Tabs.Root>
        {/if}

        <!-- Secured By Travel Date: how many tickets were SECURED for each
             travel date (NOT when they were completed). Lives outside the
             main tabs because it groups by a different date dimension and
             answers a different question ("how many seats did we secure for
             future travel?") than the rest of the page. Hidden entirely on
             older zinc that lacks the endpoint. -->
        {#if !travelUnsupported}
            <Card.Root>
                <Card.Header class="p-4 sm:p-6">
                    <Card.Title>{$_('stats.travelDate.title', { locale: $lang })}</Card.Title>
                    <Card.Description>{$_('stats.travelDate.description', { locale: $lang })}</Card.Description>
                </Card.Header>
                <Card.Content class="px-2 sm:px-6 flex flex-col gap-3">
                    <!-- independent travel-date range + direction filter; the
                         range here is the TRAVEL date (when the slot happens),
                         not the completion date the main filter bar uses -->
                    <div class="-mx-2 px-2 py-2 sm:mx-0 sm:px-3 bg-background border-y sm:border sm:rounded-lg flex flex-wrap gap-2 items-center">
                        <Popover.Root>
                            <Popover.Trigger asChild let:builder>
                                <Button variant="outline"
                                        class={cn("h-8 px-2 text-xs justify-start font-normal shrink-0", !travelAfter && "text-muted-foreground")}
                                        builders={[builder]}>
                                    <CalendarIcon class="mr-1.5 h-3.5 w-3.5"/>
                                    {travelAfter ? formatCalendarDate(travelAfter.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('stats.travelDate.range.after', { locale: $lang })}
                                </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-auto p-0" align="start">
                                <Calendar bind:value={travelAfter} onValueChange={travelRangeChange}/>
                            </Popover.Content>
                        </Popover.Root>
                        <span class="text-muted-foreground text-xs">→</span>
                        <Popover.Root>
                            <Popover.Trigger asChild let:builder>
                                <Button variant="outline"
                                        class={cn("h-8 px-2 text-xs justify-start font-normal shrink-0", !travelBefore && "text-muted-foreground")}
                                        builders={[builder]}>
                                    <CalendarIcon class="mr-1.5 h-3.5 w-3.5"/>
                                    {travelBefore ? formatCalendarDate(travelBefore.toDate(getLocalTimeZone()), $lang, {day: "numeric", month: "short", year: "2-digit"}) : $_('stats.travelDate.range.before', { locale: $lang })}
                                </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-auto p-0" align="start">
                                <Calendar bind:value={travelBefore} onValueChange={travelRangeChange}/>
                            </Popover.Content>
                        </Popover.Root>
                        <Select.Root selected={{value: travelDirection, label: travelDirection === "" ? $_('stats.filters.all', { locale: $lang }) : $_(travelDirection === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}}
                                     onSelectedChange={(s) => setTravelDirection(s?.value ?? "")}>
                            <Select.Trigger class="h-8 w-36 text-xs shrink-0">
                                <ArrowLeftRight class="mr-1.5 h-3.5 w-3.5 shrink-0"/>
                                <Select.Value placeholder={$_('stats.travelDate.filter.direction', { locale: $lang })}/>
                            </Select.Trigger>
                            <Select.Content>
                                {#each TRAVEL_DIRECTIONS as d}
                                    <Select.Item value={d}>
                                        {#if d === ""}
                                            {$_('stats.filters.all', { locale: $lang })}
                                        {:else}
                                            <span class="inline-block h-2 w-2 rounded-full mr-2 {DIR_DOT[d]}"></span>
                                            {$_(d === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang })}
                                        {/if}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        <span class="text-xs text-muted-foreground">{$_('stats.travelDate.range.hint', { locale: $lang })}</span>
                    </div>

                    {#if travelLoading && travelRows.length === 0}
                        <Loader/>
                    {:else if travelRows.length === 0}
                        <p class="text-sm text-muted-foreground px-2 py-6 text-center">{$_('stats.travelDate.empty', { locale: $lang })}</p>
                    {:else}
                        <div class="overflow-x-auto">
                            <Table.Root>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.Head class="h-9 px-2 whitespace-nowrap">{$_('stats.travelDate.table.date', { locale: $lang })}</Table.Head>
                                        {#each QUARTERS as q (q)}
                                            <Table.Head class="h-9 px-2 text-right whitespace-nowrap">{$_(`stats.travelDate.table.q${q}`, { locale: $lang })}</Table.Head>
                                        {/each}
                                        <Table.Head class="h-9 px-2 text-right whitespace-nowrap">{$_('stats.travelDate.table.total', { locale: $lang })}</Table.Head>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {#each travelRows as r (r.date)}
                                        <Table.Row>
                                            <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{travelDateLabel(r.date)}</Table.Cell>
                                            {#each QUARTERS as q (q)}
                                                {@const v = travelDirection === "" ? cellCount(r, "WToJ", q) + cellCount(r, "JToW", q) : cellCount(r, travelDirection, q)}
                                                <Table.Cell class="px-2 py-1.5 text-right tabular-nums">{formatNumber(v, $lang)}</Table.Cell>
                                            {/each}
                                            <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatNumber(rowTotal(r, travelDirection), $lang)}</Table.Cell>
                                        </Table.Row>
                                    {/each}
                                    <!-- grand total across all rendered rows under the active filter -->
                                    <Table.Row class="border-t-2">
                                        <Table.Cell class="px-2 py-1.5 font-semibold">{$_('stats.travelDate.table.total', { locale: $lang })}</Table.Cell>
                                        {#each QUARTERS as q (q)}
                                            {@const v = travelRows.reduce((s, r) => s + (travelDirection === "" ? cellCount(r, "WToJ", q) + cellCount(r, "JToW", q) : cellCount(r, travelDirection, q)), 0)}
                                            <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-semibold">{formatNumber(v, $lang)}</Table.Cell>
                                        {/each}
                                        <Table.Cell class="px-2 py-1.5 text-right tabular-nums font-bold">{formatNumber(travelGrandTotal, $lang)}</Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table.Root>
                        </div>
                    {/if}
                </Card.Content>
            </Card.Root>
        {/if}
    </div>
</div>
