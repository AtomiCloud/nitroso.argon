<script lang="ts">
    import { onMount, tick } from "svelte";
    import { page } from "$app/stores";
    import { afterNavigate, goto } from "$app/navigation";
    import { api } from "../../store";
    import { invalidateAll } from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";

    import { Calendar } from "$lib/components/ui/calendar";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { cn } from "$lib/utils";
    import { CalendarDate, type DateValue, getLocalTimeZone } from "@internationalized/date";
    import { singaporeToday } from "$lib/time/singapore";
    import { CalendarIcon, ChevronRight, LucideLoader, RotateCw, Search, Tag, X } from "lucide-svelte";
    import type { ProblemDetails } from "../../errors/problem_details";
    import type { UserPartnerPnlRowRes, UserPrincipalRes } from "$lib/api/core/data-contracts";
    import { Res } from "$lib/core/result";
    import { toResult } from "$lib/utility";
    import Loader from "$lib/components/complex/loader.svelte";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import { toast } from "svelte-sonner";
    import { _ } from "svelte-i18n";
    import { formatCalendarDate, formatMoney, formatNumber, lang } from "$lib/i18n";
    import type { PageData } from "./$types";
    import {
        LIST_BOOST_PRICE,
        type PartnerPnlRow,
        monthSortKey,
        partnerPnlTotals,
        partnerPnlZeroFill,
    } from "./partners";

    export let data: PageData;

    // Owner-only partner arbitrage page. Resellers are tagged with the 'partner'
    // extraRole via POST /User/{id}/roles/partner; this page lists every
    // partner-tagged user and lets the owner inspect monthly arbitrage signals.
    //
    // Layout: a partner list on the left + an arbitrage table on the right. The
    // date range picker filters the table; the picked partner survives a
    // range change. Tag-as-partner uses the same /User search the /users
    // page uses, so owners can pick from the recent-user pool without
    // having to type. Untag uses an AlertDialog confirm (irreversible —
    // removes the role from the user).
    //
    // The selected partner ID and date bounds are mirrored into the URL
    // query string (selected/from/to, defaults omitted) so back / refresh /
    // share reproduce the exact view. The partner list is loaded by the
    // page loader (see +page.ts); the per-partner monthly fetch happens
    // client-side on selection.

    function toApiDate(d: DateValue): string {
        const dd = String(d.day).padStart(2, "0");
        const mm = String(d.month).padStart(2, "0");
        return `${dd}-${mm}-${d.year}`;
    }

    function fromApiDate(s: string | null | undefined): DateValue | null {
        const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s ?? "");
        return m ? new CalendarDate(Number(m[3]), Number(m[2]), Number(m[1])) : null;
    }

    // "MM-yyyy" → a localized label like "Jul 2026" (zinc's monthly buckets)
    function monthLabel(month: string): string {
        const m = /^(\d{2})-(\d{4})$/.exec(month);
        if (m == null) return month;
        return formatCalendarDate(new Date(Number(m[2]), Number(m[1]) - 1, 1), $lang, {
            month: "short",
            year: "numeric",
        });
    }

    function deltaClass(delta: number): string {
        if (delta > 0) return "text-green-600 dark:text-green-400";
        if (delta < 0) return "text-red-600 dark:text-red-400";
        return "";
    }

    function signedPct(pct: number): string {
        const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
        return `${sign}${(Math.abs(pct) * 100).toFixed(1)}%`;
    }

    function signedMoney(amount: number): string {
        return `${amount > 0 ? "+" : ""}${formatMoney(amount, $lang)}`;
    }

    // Default range = the last 6 months ending in Singapore today (partners
    // are a low-volume cohort — going beyond 6 months just makes the table
    // noisier without telling a different story).
    const today = singaporeToday();
    let after: DateValue | undefined = today.subtract({ months: 6 });
    let before: DateValue | undefined = today;

    function rangeQuery() {
        return {
            ...(after == null ? {} : { After: toApiDate(after) }),
            ...(before == null ? {} : { Before: toApiDate(before) }),
        };
    }

    // the page loader returns [partners, candidate-users-for-tagging] — keep
    // both so the tag-as-partner form can be rebuilt after the partner list
    // refreshes without losing the search pool
    let partners: UserPrincipalRes[] = [];
    let candidates: UserPrincipalRes[] = [];
    let loadFailed = false;

    // The loader returns either a single err (partners list failed) or
    // [partners, candidates] (candidates may be [] on soft failure). Same
    // pattern as the /users page: Res.fromSerial(...).match() yields a
    // Promise; we await it via {#await} in the template. The err branch
    // is "unreachable" in the type (returns null as never) but still runs
    // to set the failure flag.
    $: loadOutcome = (Res.fromSerial<[UserPrincipalRes[], UserPrincipalRes[]], ProblemDetails>(data.result).match({
        ok: ([p, c]) => {
            loadFailed = false;
            return [p, c] as [UserPrincipalRes[], UserPrincipalRes[]];
        },
        err: e => {
            console.error(e);
            loadFailed = true;
            return null as never;
        },
    }) satisfies Promise<[UserPrincipalRes[], UserPrincipalRes[]]>);

    function applyLoaded(v: [UserPrincipalRes[], UserPrincipalRes[]]) {
        partners = v[0];
        candidates = v[1];
        // if the URL-seeded selection no longer points at a partner (someone
        // untagged while the page was open), drop it
        if (selectedId !== "" && !partners.some(p => p.id === selectedId)) {
            selectedId = "";
        }
    }

    // selected partner (URL-mirrored)
    let selectedId = "";

    $: selectedPartner = partners.find(p => p.id === selectedId) ?? null;

    // per-partner P&L state
    let pnlRows: PartnerPnlRow[] = [];
    let pnlLoading = false;
    let pnlFailed = false;

    // candidate users that are NOT already partners (the tag-as-partner
    // search filters out anyone who's already tagged)
    let tagQuery = "";
    $: nonPartnerCandidates = candidates.filter(
        c => !(c.extraRoles ?? []).includes("partner") && (c.id ?? "") !== "",
    );
    $: visibleCandidates = (() => {
        const q = tagQuery.trim().toLowerCase();
        if (q === "") return nonPartnerCandidates.slice(0, 10);
        return nonPartnerCandidates
            .filter(c => (c.username ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q))
            .slice(0, 10);
    })();

    async function loadPnl() {
        if (selectedId === "") {
            pnlRows = [];
            pnlRaw = [];
            return;
        }
        // race guard: if the owner clicks a new partner (or changes the
        // range) before the in-flight request resolves, the late response
        // would clobber pnlRaw / pnlFailed for the current selection. The
        // token bumps on every call; only the latest may write.
        const myToken = ++pnlToken;
        pnlLoading = true;
        pnlFailed = false;
        await toResult(
            () => $api.vUserPnlDetail(selectedId, "1", rangeQuery()),
            $_("partners.pnl.loadError", { locale: $lang }),
        ).match({
            ok: (r: UserPartnerPnlRowRes[]) => {
                if (myToken !== pnlToken) return;
                pnlRaw = r;
                pnlFailed = false;
            },
            err: e => {
                if (myToken !== pnlToken) return;
                console.error(e);
                pnlFailed = true;
            },
        });
        if (myToken === pnlToken) pnlLoading = false;
    }

    // Bumped on every loadPnl() invocation; readers compare their captured
    // token to drop stale responses (the page is owner-only with a single
    // selection at a time, but rapid clicks would otherwise race).
    let pnlToken = 0;

    let pnlRaw: UserPartnerPnlRowRes[] = [];

    // P&L is zero-filled across the picked range so months with no activity
    // still appear (matches the /analysis P&L tab convention — see
    // pnlZeroFill). Bounds are MM-yyyy labels derived from the same date
    // picker the rest of the page uses.
    $: pnlBounds = {
        from: after == null ? "" : `${String(after.month).padStart(2, "0")}-${after.year}`,
        to: before == null ? "" : `${String(before.month).padStart(2, "0")}-${before.year}`,
    };
    $: pnlRows = partnerPnlZeroFill(pnlRaw, pnlBounds.from, pnlBounds.to);
    $: pnlTotal = partnerPnlTotals(pnlRows);

    let expandedMoneyMonths = new Set<string>();

    function toggleMoneyMovement(month: string) {
        const next = new Set(expandedMoneyMonths);
        if (next.has(month)) next.delete(month);
        else next.add(month);
        expandedMoneyMonths = next;
    }

    function collapseMoneyMovement() {
        expandedMoneyMonths = new Set();
    }

    async function rangeChange() {
        await tick();
        collapseMoneyMovement();
        await loadPnl();
        syncUrl();
    }

    function pickPartner(id: string) {
        selectedId = id;
        collapseMoneyMovement();
        loadPnl();
        syncUrl();
    }

    // ---- tag-as-partner ----
    let tagging = false;
    async function tagPartner(user: UserPrincipalRes) {
        const id = user.id ?? "";
        if (id === "") return;
        tagging = true;
        await toResult(
            () => $api.vUserRolesCreate(id, "partner", "1"),
            $_("partners.tag.error", { locale: $lang }),
        ).match({
            ok: () => {
                toast.success(
                    $_("partners.tag.success", {
                        locale: $lang,
                        values: { username: user.username ?? "" },
                    }),
                );
                tagQuery = "";
                // refresh the partner list + the candidate pool (the new
                // partner drops out of the search)
                invalidateAll().then(() => {
                    // select the freshly tagged partner so the owner sees
                    // the empty arbitrage table immediately
                    selectedId = id;
                    loadPnl();
                });
            },
            err: e => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            },
        });
        tagging = false;
    }

    // ---- untag-with-confirm ----
    let untagTarget: UserPrincipalRes | null = null;
    let untagging = false;

    function confirmUntag(p: UserPrincipalRes) {
        untagTarget = p;
    }

    async function doUntag() {
        if (untagTarget == null) return;
        const id = untagTarget.id ?? "";
        if (id === "") return;
        untagging = true;
        await toResult(
            () => $api.vUserRolesDelete(id, "partner", "1"),
            $_("partners.untag.error", { locale: $lang }),
        ).match({
            ok: () => {
                toast.success(
                    $_("partners.untag.success", {
                        locale: $lang,
                        values: { username: untagTarget?.username ?? "" },
                    }),
                );
                const wasSelected = selectedId === id;
                untagTarget = null;
                invalidateAll().then(() => {
                    if (wasSelected) {
                        selectedId = "";
                        collapseMoneyMovement();
                        pnlRows = [];
                        pnlRaw = [];
                    }
                    syncUrl();
                });
            },
            err: e => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            },
        });
        untagging = false;
    }

    function cancelUntag() {
        untagTarget = null;
    }

    // ---- URL state mirroring ----
    // selected/from/to — defaults omitted, tab changes replace history so
    // back walks the partner trail
    const defAfterStr = toApiDate(after);
    const defBeforeStr = toApiDate(before);
    let urlReady = false;
    let lastSelected = "";

    // The picker operates on day-level dates, but the URL round-trips the
    // range as MM-yyyy (we use the month boundaries for the P&L table
    // zero-fill). When seeding the picker from a URL `to=MM-yyyy`, the
    // `before` DateValue must point at the LAST day of the picked month —
    // not day 28, which would silently truncate the last 1-3 days of
    // 29/30/31-day months (the P&L endpoint treats the bound as inclusive).
    function lastDayOfMonth(month: number, year: number): number {
        // 0th day of (month+1) = last day of `month` in Date arithmetic
        return new Date(Date.UTC(year, month, 0)).getUTCDate();
    }

    function applyUrl(q: URLSearchParams) {
        const id = q.get("selected") ?? "";
        selectedId = id;
        lastSelected = id;
        const from = q.get("from");
        const to = q.get("to");
        const parsedFrom = from ? monthSortKey(from) : "";
        const parsedTo = to ? monthSortKey(to) : "";
        if (parsedFrom !== "" && parsedTo !== "" && parsedFrom <= parsedTo) {
            const fm = /^(\d{2})-(\d{4})$/.exec(from ?? "");
            const tm = /^(\d{2})-(\d{4})$/.exec(to ?? "");
            if (fm && tm) {
                const toMonth = Number(tm[1]);
                const toYear = Number(tm[2]);
                after = new CalendarDate(Number(fm[2]), Number(fm[1]), 1);
                before = new CalendarDate(toYear, toMonth, lastDayOfMonth(toMonth, toYear));
            }
        } else {
            after = fromApiDate(defAfterStr) ?? undefined;
            before = fromApiDate(defBeforeStr) ?? undefined;
        }
    }

    function serializeUrl(): string {
        const q = new URLSearchParams();
        if (selectedId !== "") q.set("selected", selectedId);
        if (after != null && toApiDate(after) !== defAfterStr) {
            q.set("from", `${String(after.month).padStart(2, "0")}-${after.year}`);
        }
        if (before != null && toApiDate(before) !== defBeforeStr) {
            q.set("to", `${String(before.month).padStart(2, "0")}-${before.year}`);
        }
        return q.toString();
    }

    function syncUrl() {
        if (!urlReady) return;
        const search = serializeUrl();
        const push = selectedId !== lastSelected;
        lastSelected = selectedId;
        if (search === $page.url.searchParams.toString()) return;
        goto(`${$page.url.pathname}${search ? `?${search}` : ""}`, {
            replaceState: !push,
            keepFocus: true,
            noScroll: true,
        });
    }

    function onUrlChange(u: URL) {
        if (u.searchParams.toString() === serializeUrl()) return;
        const prevA = after == null ? "" : toApiDate(after);
        const prevB = before == null ? "" : toApiDate(before);
        applyUrl(u.searchParams);
        const nextA = after == null ? "" : toApiDate(after);
        const nextB = before == null ? "" : toApiDate(before);
        if (nextA !== prevA || nextB !== prevB || selectedId !== lastSelected) {
            loadPnl();
        }
    }

    onMount(async () => {
        applyUrl($page.url.searchParams);
        urlReady = true;
        await loadPnl();
    });

    // browser back/forward moves the URL without remounting — reapply the
    // selection/range it encodes (syncUrl's own goto()s serialize to the
    // same params, so onUrlChange no-ops for self-inflicted navigations)
    afterNavigate(() => {
        if (!urlReady) return;
        onUrlChange($page.url);
    });
</script>

<div class="flex flex-col">
    <div class="border-b bg-muted">
        <div
            class="flex justify-center sm:justify-between gap-4 flex-wrap py-8 items-center text-foreground max-w-[1400px] w-11/12 mx-auto"
        >
            <div class="text-3xl lg:text-4xl">
                {$_("partners.title", { locale: $lang })}
            </div>
            <Button
                variant="outline"
                disabled={false}
                on:click={() => invalidateAll().then(() => loadPnl())}
            >
                <RotateCw class="mr-2 h-4 w-4" />
                {$_("partners.reload", { locale: $lang })}
            </Button>
        </div>
    </div>

    <div class="flex flex-col gap-4 w-full px-2 sm:px-0 sm:w-11/12 max-w-[1400px] mx-auto my-4 sm:my-8">
        {#if loadFailed}
            <div class="flex flex-col items-center gap-4 py-12">
                <p class="text-muted-foreground">{$_("partners.loadError", { locale: $lang })}</p>
            </div>
        {:else}
            {#await loadOutcome then loaded}
                {applyLoaded(loaded)}
                <div class="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr]">
                <!-- LEFT: partner list + tag-as-partner form -->
                <div class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4">
                            <Card.Title class="text-base">
                                {$_("partners.list.title", { locale: $lang })}
                            </Card.Title>
                            <Card.Description>
                                {$_("partners.list.description", {
                                    locale: $lang,
                                    values: { count: formatNumber(partners.length, $lang) },
                                })}
                            </Card.Description>
                        </Card.Header>
                        <Card.Content class="px-2 pb-2 sm:px-4 sm:pb-4">
                            {#if partners.length === 0}
                                <p class="text-sm text-muted-foreground px-2">
                                    {$_("partners.list.empty", { locale: $lang })}
                                </p>
                            {:else}
                                <div class="flex flex-col gap-1">
                                    {#each partners as p (p.id)}
                                        <div
                                            class="flex items-center gap-2 rounded-md border px-2 py-2 cursor-pointer hover:bg-muted/40 transition-colors {selectedId ===
                                            p.id
                                                ? 'border-primary bg-primary/5'
                                                : ''}"
                                            role="button"
                                            tabindex="0"
                                            on:click={() => pickPartner(p.id ?? "")}
                                            on:keydown={e => {
                                                if (e.key === "Enter" || e.key === " ") pickPartner(p.id ?? "");
                                            }}
                                        >
                                            <div class="flex-1 min-w-0">
                                                <div class="font-medium truncate">{p.username ?? ""}</div>
                                                <div class="text-xs text-muted-foreground truncate">
                                                    {p.email || $_("partners.list.noEmail", { locale: $lang })}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="h-7 w-7 shrink-0"
                                                aria-label={$_("partners.untag.aria", {
                                                    locale: $lang,
                                                    values: { username: p.username ?? "" },
                                                })}
                                                title={$_("partners.untag.aria", {
                                                    locale: $lang,
                                                    values: { username: p.username ?? "" },
                                                })}
                                                on:click={e => {
                                                    e.stopPropagation();
                                                    confirmUntag(p);
                                                }}
                                            >
                                                <X class="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>

                    <Card.Root>
                        <Card.Header class="p-4">
                            <Card.Title class="text-base">
                                {$_("partners.tag.title", { locale: $lang })}
                            </Card.Title>
                            <Card.Description>{$_("partners.tag.description", { locale: $lang })}</Card.Description>
                        </Card.Header>
                        <Card.Content class="px-4 pb-4">
                            <div class="flex flex-col gap-2">
                                <div class="relative">
                                    <Search
                                        class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                                    />
                                    <Input
                                        class="pl-7 h-9"
                                        placeholder={$_("partners.tag.searchPlaceholder", { locale: $lang })}
                                        bind:value={tagQuery}
                                    />
                                </div>
                                {#if visibleCandidates.length === 0}
                                    <p class="text-sm text-muted-foreground px-1 py-1">
                                        {tagQuery.trim() === ""
                                            ? $_("partners.tag.noMoreCandidates", { locale: $lang })
                                            : $_("partners.tag.noMatch", { locale: $lang })}
                                    </p>
                                {:else}
                                    <ul class="flex flex-col divide-y border rounded-md max-h-72 overflow-y-auto">
                                        {#each visibleCandidates as c (c.id)}
                                            <li class="flex items-center gap-2 px-2 py-1.5 text-sm">
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-medium truncate">{c.username ?? ""}</div>
                                                    <div class="text-xs text-muted-foreground truncate">{c.email ?? ""}</div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={tagging}
                                                    on:click={() => tagPartner(c)}
                                                >
                                                    {#if tagging}
                                                        <LucideLoader class="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                    {:else}
                                                        <Tag class="mr-1.5 h-3.5 w-3.5" />
                                                    {/if}
                                                    {$_("partners.tag.button", { locale: $lang })}
                                                </Button>
                                            </li>
                                        {/each}
                                    </ul>
                                {/if}
                            </div>
                        </Card.Content>
                    </Card.Root>
                </div>

                <!-- RIGHT: arbitrage table for the selected partner -->
                <div class="flex flex-col gap-4">
                    <Card.Root>
                        <Card.Header class="p-4 sm:p-6">
                            <div class="flex flex-wrap justify-between items-start gap-3">
                                <div class="flex flex-col gap-1">
                                    <Card.Title>
                                        {#if selectedPartner != null}
                                            {selectedPartner.username ?? ""}
                                        {:else}
                                            {$_("partners.pnl.title", { locale: $lang })}
                                        {/if}
                                    </Card.Title>
                                    <Card.Description>
                                        {#if selectedPartner != null}
                                            {selectedPartner.email || $_("partners.list.noEmail", { locale: $lang })}
                                        {:else}
                                            {$_("partners.pnl.description", { locale: $lang })}
                                        {/if}
                                    </Card.Description>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Content class="px-2 sm:px-6">
                            <!-- date-range picker; same convention as /analysis -->
                            <div
                                class="-mx-2 px-2 py-2 sm:mx-0 sm:px-3 bg-background border-y sm:border sm:rounded-lg flex flex-wrap gap-2 items-center mb-4"
                            >
                                <Popover.Root>
                                    <Popover.Trigger asChild let:builder>
                                        <Button
                                            variant="outline"
                                            class={cn(
                                                "h-8 px-2 text-xs justify-start font-normal shrink-0",
                                                !after && "text-muted-foreground",
                                            )}
                                            builders={[builder]}
                                        >
                                            <CalendarIcon class="mr-1.5 h-3.5 w-3.5" />
                                            {after
                                                ? formatCalendarDate(after.toDate(getLocalTimeZone()), $lang, {
                                                      day: "numeric",
                                                      month: "short",
                                                      year: "2-digit",
                                                  })
                                                : $_("partners.range.after", { locale: $lang })}
                                        </Button>
                                    </Popover.Trigger>
                                    <Popover.Content class="w-auto p-0" align="start">
                                        <Calendar bind:value={after} onValueChange={rangeChange} />
                                    </Popover.Content>
                                </Popover.Root>
                                <span class="text-muted-foreground text-xs">→</span>
                                <Popover.Root>
                                    <Popover.Trigger asChild let:builder>
                                        <Button
                                            variant="outline"
                                            class={cn(
                                                "h-8 px-2 text-xs justify-start font-normal shrink-0",
                                                !before && "text-muted-foreground",
                                            )}
                                            builders={[builder]}
                                        >
                                            <CalendarIcon class="mr-1.5 h-3.5 w-3.5" />
                                            {before
                                                ? formatCalendarDate(before.toDate(getLocalTimeZone()), $lang, {
                                                      day: "numeric",
                                                      month: "short",
                                                      year: "2-digit",
                                                  })
                                                : $_("partners.range.before", { locale: $lang })}
                                        </Button>
                                    </Popover.Trigger>
                                    <Popover.Content class="w-auto p-0" align="start">
                                        <Calendar bind:value={before} onValueChange={rangeChange} />
                                    </Popover.Content>
                                </Popover.Root>
                                <span class="text-xs text-muted-foreground">
                                    {$_("partners.range.hint", { locale: $lang })}
                                </span>
                            </div>
                            {#if selectedId === ""}
                                <p class="text-sm text-muted-foreground px-2 py-8 text-center">
                                    {$_("partners.pnl.noSelection", { locale: $lang })}
                                </p>
                            {:else if pnlFailed}
                                <div class="flex items-center gap-3 px-2">
                                    <p class="text-sm text-destructive">
                                        {$_("partners.pnl.loadError", { locale: $lang })}
                                    </p>
                                    <Button variant="outline" size="sm" disabled={pnlLoading} on:click={loadPnl}>
                                        {$_("partners.reload", { locale: $lang })}
                                    </Button>
                                </div>
                            {:else if pnlLoading && pnlRows.length === 0}
                                <Loader />
                            {:else}
                                <div class="overflow-hidden rounded-lg border">
                                    <Table.Root class="min-w-[1120px]">
                                        <Table.Caption
                                            class="caption-top mt-0 border-b border-amber-200/70 bg-amber-50/70 px-4 py-3 text-left text-sm leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100"
                                        >
                                            {$_("partners.pnl.caption", { locale: $lang })}
                                        </Table.Caption>
                                        <Table.Header class="bg-muted/40">
                                            <Table.Row>
                                                <Table.Head class="h-11 min-w-[150px] px-3 whitespace-nowrap">
                                                    <span class="inline-flex items-center gap-1">
                                                        {$_("partners.pnl.colMonth", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colMonth", { locale: $lang })}>
                                                            {$_("partners.pnl.monthHint", { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-11 min-w-[150px] px-3 text-right whitespace-nowrap">
                                                    <span class="inline-flex w-full items-center justify-end gap-1">
                                                        {$_("partners.pnl.colTickets", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colTickets", { locale: $lang })}>
                                                            {$_("partners.pnl.ticketsHint", { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-11 min-w-[145px] px-3 text-right whitespace-nowrap">
                                                    <span class="inline-flex w-full items-center justify-end gap-1">
                                                        {$_("partners.pnl.colBoosts", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colBoosts", { locale: $lang })}>
                                                            {$_("partners.pnl.boostsHint", { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-11 min-w-[165px] px-3 text-right whitespace-nowrap">
                                                    <span class="inline-flex w-full items-center justify-end gap-1">
                                                        {$_("partners.pnl.colBoostList", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colBoostList", { locale: $lang })}>
                                                            {$_("partners.pnl.boostListHint", {
                                                                locale: $lang,
                                                                values: { price: formatMoney(LIST_BOOST_PRICE, $lang) },
                                                            })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-11 min-w-[150px] px-3 text-right whitespace-nowrap">
                                                    <span class="inline-flex w-full items-center justify-end gap-1">
                                                        {$_("partners.pnl.colPassengers", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colPassengers", { locale: $lang })}>
                                                            {$_("partners.pnl.passengersHint", { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-11 min-w-[125px] px-3 text-right whitespace-nowrap">
                                                    <span class="inline-flex w-full items-center justify-end gap-1">
                                                        {$_("partners.pnl.colCollected", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colCollected", { locale: $lang })}>
                                                            {$_("partners.pnl.collectedHint", { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-11 min-w-[135px] px-3 text-right whitespace-nowrap">
                                                    <span class="inline-flex w-full items-center justify-end gap-1">
                                                        {$_("partners.pnl.colKtmbCost", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colKtmbCost", { locale: $lang })}>
                                                            {$_("partners.pnl.ktmbCostHint", { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                                <Table.Head class="h-11 min-w-[130px] px-3 text-right whitespace-nowrap">
                                                    <span class="inline-flex w-full items-center justify-end gap-1">
                                                        {$_("partners.pnl.colMargin", { locale: $lang })}
                                                        <InfoTip label={$_("partners.pnl.colMargin", { locale: $lang })}>
                                                            {$_("partners.pnl.marginHint", { locale: $lang })}
                                                        </InfoTip>
                                                    </span>
                                                </Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {#each pnlRows as r (r.month)}
                                                {@const isExpanded = expandedMoneyMonths.has(r.month)}
                                                {@const isEmpty =
                                                    r.bookings === 0 &&
                                                    r.boostCount === 0 &&
                                                    r.boostAmount === 0 &&
                                                    r.distinctPassengers === 0 &&
                                                    r.collected === 0 &&
                                                    r.ktmbCost === 0 &&
                                                    r.deposits === 0 &&
                                                    r.withdrawalGross === 0 &&
                                                    r.withdrawalFeeIncome === 0}
                                                <Table.Row class={isEmpty ? "text-muted-foreground/60" : ""}>
                                                    <Table.Cell class="px-2 py-2 font-medium whitespace-nowrap">
                                                        <div class="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                class="h-7 w-7 shrink-0"
                                                                aria-expanded={isExpanded}
                                                                aria-controls={`partner-money-${r.month}`}
                                                                aria-label={$_(
                                                                    isExpanded
                                                                        ? "partners.pnl.hideMoneyMovement"
                                                                        : "partners.pnl.showMoneyMovement",
                                                                    {
                                                                        locale: $lang,
                                                                        values: { month: monthLabel(r.month) },
                                                                    },
                                                                )}
                                                                title={$_(
                                                                    isExpanded
                                                                        ? "partners.pnl.hideMoneyMovement"
                                                                        : "partners.pnl.showMoneyMovement",
                                                                    {
                                                                        locale: $lang,
                                                                        values: { month: monthLabel(r.month) },
                                                                    },
                                                                )}
                                                                on:click={() => toggleMoneyMovement(r.month)}
                                                            >
                                                                <ChevronRight
                                                                    class={cn(
                                                                        "h-3.5 w-3.5 transition-transform",
                                                                        isExpanded && "rotate-90",
                                                                    )}
                                                                />
                                                            </Button>
                                                            <span>{monthLabel(r.month)}</span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                                                        {$_("partners.pnl.cellTickets", {
                                                            locale: $lang,
                                                            values: {
                                                                count: formatNumber(r.bookings, $lang),
                                                                average: formatMoney(r.averageTicketPaid, $lang),
                                                            },
                                                        })}
                                                    </Table.Cell>
                                                    <Table.Cell class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                                                        {$_("partners.pnl.cellBoosts", {
                                                            locale: $lang,
                                                            values: {
                                                                count: formatNumber(r.boostCount, $lang),
                                                                paid: formatMoney(r.boostAmount, $lang),
                                                            },
                                                        })}
                                                    </Table.Cell>
                                                    <Table.Cell class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                                                        <div class="flex flex-col items-end leading-tight">
                                                            <span>{formatMoney(r.boostListValue, $lang)}</span>
                                                            <span
                                                                class={r.boostListGap > 0
                                                                    ? "mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                                                                    : "mt-1 text-[11px] text-muted-foreground"}
                                                            >
                                                                {$_("partners.pnl.listDelta", {
                                                                    locale: $lang,
                                                                    values: { delta: signedMoney(r.boostListGap) },
                                                                })}
                                                            </span>
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell class="px-3 py-2 text-right tabular-nums">
                                                        {formatNumber(r.distinctPassengers, $lang)}
                                                    </Table.Cell>
                                                    <Table.Cell class="px-3 py-2 text-right tabular-nums">
                                                        {formatMoney(r.collected, $lang)}
                                                    </Table.Cell>
                                                    <Table.Cell class="px-3 py-2 text-right tabular-nums">
                                                        {formatMoney(r.ktmbCost, $lang)}
                                                    </Table.Cell>
                                                    <Table.Cell class="px-3 py-2 text-right tabular-nums">
                                                        <div class="flex flex-col items-end leading-tight {deltaClass(r.margin)}">
                                                            <span class="font-bold">{formatMoney(r.margin, $lang)}</span>
                                                            <span class="mt-1 text-[11px] font-medium">{signedPct(r.marginPct)}</span>
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                                {#if isExpanded}
                                                    <Table.Row
                                                        id={`partner-money-${r.month}`}
                                                        class="bg-muted/20 hover:bg-muted/20"
                                                    >
                                                        <Table.Cell colspan={8} class="px-3 py-3">
                                                            <div
                                                                class="ml-7 rounded-md border border-dashed bg-background/80 px-3 py-2.5"
                                                            >
                                                                <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                                                    <span class="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                                                                        {$_("partners.pnl.moneyMovement", { locale: $lang })}
                                                                    </span>
                                                                    <span class="text-xs text-muted-foreground">
                                                                        {$_("partners.pnl.moneyMovementHint", { locale: $lang })}
                                                                    </span>
                                                                </div>
                                                                <div class="grid gap-2 sm:grid-cols-3">
                                                                    <div class="rounded-md bg-muted/40 px-3 py-2">
                                                                        <div class="text-xs text-muted-foreground">
                                                                            {$_("partners.pnl.deposits", { locale: $lang })}
                                                                        </div>
                                                                        <div class="mt-0.5 font-medium tabular-nums">
                                                                            {formatMoney(r.deposits, $lang)}
                                                                        </div>
                                                                    </div>
                                                                    <div class="rounded-md bg-muted/40 px-3 py-2">
                                                                        <div class="text-xs text-muted-foreground">
                                                                            {$_("partners.pnl.withdrawalsGross", {
                                                                                locale: $lang,
                                                                            })}
                                                                        </div>
                                                                        <div class="mt-0.5 font-medium tabular-nums">
                                                                            {formatMoney(r.withdrawalGross, $lang)}
                                                                        </div>
                                                                    </div>
                                                                    <div class="rounded-md bg-muted/40 px-3 py-2">
                                                                        <div class="text-xs text-muted-foreground">
                                                                            {$_("partners.pnl.withdrawalFeeIncome", {
                                                                                locale: $lang,
                                                                            })}
                                                                        </div>
                                                                        <div class="mt-0.5 font-medium tabular-nums">
                                                                            {formatMoney(r.withdrawalFeeIncome, $lang)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                {/if}
                                            {/each}
                                            <Table.Row class="border-t-2 bg-muted/50 hover:bg-muted/50">
                                                <Table.Cell class="px-3 py-2.5 pl-11 font-semibold whitespace-nowrap">
                                                    {$_("partners.pnl.total", { locale: $lang })}
                                                </Table.Cell>
                                                <Table.Cell class="px-3 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap">
                                                    {$_("partners.pnl.cellTickets", {
                                                        locale: $lang,
                                                        values: {
                                                            count: formatNumber(pnlTotal.bookings, $lang),
                                                            average: formatMoney(pnlTotal.averageTicketPaid, $lang),
                                                        },
                                                    })}
                                                </Table.Cell>
                                                <Table.Cell class="px-3 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap">
                                                    {$_("partners.pnl.cellBoosts", {
                                                        locale: $lang,
                                                        values: {
                                                            count: formatNumber(pnlTotal.boostCount, $lang),
                                                            paid: formatMoney(pnlTotal.boostAmount, $lang),
                                                        },
                                                    })}
                                                </Table.Cell>
                                                <Table.Cell class="px-3 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap">
                                                    <div class="flex flex-col items-end leading-tight">
                                                        <span>{formatMoney(pnlTotal.boostListValue, $lang)}</span>
                                                        <span
                                                            class={pnlTotal.boostListGap > 0
                                                                ? "mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                                                                : "mt-1 text-[11px] text-muted-foreground"}
                                                        >
                                                            {$_("partners.pnl.listDelta", {
                                                                locale: $lang,
                                                                values: { delta: signedMoney(pnlTotal.boostListGap) },
                                                            })}
                                                        </span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell class="px-3 py-2.5 text-right tabular-nums font-semibold">
                                                    {formatNumber(pnlTotal.distinctPassengers, $lang)}
                                                </Table.Cell>
                                                <Table.Cell class="px-3 py-2.5 text-right tabular-nums font-semibold">
                                                    {formatMoney(pnlTotal.collected, $lang)}
                                                </Table.Cell>
                                                <Table.Cell class="px-3 py-2.5 text-right tabular-nums font-semibold">
                                                    {formatMoney(pnlTotal.ktmbCost, $lang)}
                                                </Table.Cell>
                                                <Table.Cell class="px-3 py-2.5 text-right tabular-nums">
                                                    <div
                                                        class="flex flex-col items-end leading-tight font-semibold {deltaClass(
                                                            pnlTotal.margin,
                                                        )}"
                                                    >
                                                        <span class="font-bold">{formatMoney(pnlTotal.margin, $lang)}</span>
                                                        <span class="mt-1 text-[11px]">{signedPct(pnlTotal.marginPct)}</span>
                                                    </div>
                                                </Table.Cell>
                                            </Table.Row>
                                        </Table.Body>
                                    </Table.Root>
                                </div>
                            {/if}
                        </Card.Content>
                    </Card.Root>
                </div>
            </div>
            {/await}
        {/if}
    </div>
</div>

<!-- Untag confirm dialog -->
<Dialog.Root open={untagTarget != null} onOpenChange={o => { if (!o) cancelUntag(); }}>
    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>{$_("partners.untag.title", { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                {$_("partners.untag.body", {
                    locale: $lang,
                    values: { username: untagTarget?.username ?? "" },
                })}
            </Dialog.Description>
        </Dialog.Header>
        <div class="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" on:click={cancelUntag} disabled={untagging}>
                {$_("actions.cancel", { locale: $lang })}
            </Button>
            <Button variant="destructive" on:click={doUntag} disabled={untagging}>
                {#if untagging}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                {$_("partners.untag.confirm", { locale: $lang })}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
