<script lang="ts">
    import {onDestroy, onMount} from "svelte";
    import {LucideLoader, SearchCheck} from "lucide-svelte";
    // @ts-ignore
    import * as Card from "$lib/components/ui/card";
    import {Badge} from "$lib/components/ui/badge";
    import {Button} from "$lib/components/ui/button";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import type {BookingKtmbCheckRes, BookingPrincipalRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {formatDateTime, lang} from "$lib/i18n";
    import {
        KTMB_CHECK_POLL_INTERVAL_MS,
        deriveKtmbCheckView,
        isKtmbCheckProminent,
        relativeAge,
        shouldPoll,
        type RelativeAge,
    } from "$lib/ktmb_check";

    // Admin-only, READ-ONLY: asks zinc/tin whether OUR KTMB account holds a
    // ticket for this passenger/date/direction. Never completes, refunds or
    // recycles anything. The parent gates rendering on the admin role.
    export let booking: BookingPrincipalRes;

    let check: BookingKtmbCheckRes | null = null;
    let loaded = false;
    let loadFailed = false;
    let requesting = false;
    let now = Date.now();
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    // bumped on every new request so a slow stale response cannot overwrite a newer check
    let generation = 0;

    $: view = deriveKtmbCheckView(check, now);
    $: pending = view.kind === "pending" && !view.timedOut;
    $: busy = requesting || pending;
    $: prominent = isKtmbCheckProminent(booking.status);

    // reactive so every "x min ago" re-renders when `now` or the locale changes
    $: ago = (iso: string): string => {
        const a: RelativeAge = relativeAge(iso, now);
        return $_(`bookingActions.ktmbCheck.ago.${a.unit}`, {locale: $lang, values: {count: a.value}});
    };

    function stopPolling() {
        if (pollTimer != null) clearTimeout(pollTimer);
        pollTimer = null;
    }

    function schedulePoll() {
        stopPolling();
        now = Date.now();
        if (destroyed || !shouldPoll(check, now)) return;
        pollTimer = setTimeout(poll, KTMB_CHECK_POLL_INTERVAL_MS);
    }

    async function fetchLatest(): Promise<BookingKtmbCheckRes | null | undefined> {
        // undefined = transient failure, null = 404 (never checked)
        try {
            const r = await $api.vBookingKtmbCheckDetail(booking.id, "1");
            return r.data;
        } catch (e: any) {
            if (e?.status === 404) return null;
            console.error(e);
            return undefined;
        }
    }

    async function poll() {
        const g = generation;
        const latest = await fetchLatest();
        if (destroyed || g !== generation) return;
        // a transient poll failure keeps the previous check and retries until the timeout
        if (latest !== undefined) check = latest;
        schedulePoll();
    }

    async function load() {
        const g = generation;
        const latest = await fetchLatest();
        if (destroyed || g !== generation) return;
        loadFailed = latest === undefined;
        if (latest !== undefined) check = latest;
        loaded = true;
        schedulePoll();
    }

    async function requestCheck() {
        requesting = true;
        const g = ++generation;
        stopPolling();
        try {
            const r = await $api.vBookingKtmbCheckCreate(booking.id, "1");
            if (destroyed || g !== generation) return;
            check = r.data;
            loaded = true;
            loadFailed = false;
            schedulePoll();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.error?.detail ?? $_('bookingActions.ktmbCheck.requestFailed', {locale: $lang}));
            schedulePoll();
        } finally {
            requesting = false;
        }
    }

    onMount(load);
    onDestroy(() => {
        destroyed = true;
        stopPolling();
    });
</script>

<Card.Root class="flex-1 min-w-fit {prominent ? 'border-2 border-orange-500' : ''}">
    <Card.Header>
        <div class="flex flex-wrap gap-4 justify-between items-center">
            <div>
                <Card.Title class="flex items-center gap-2">
                    <SearchCheck class="h-5 w-5"/>
                    {$_('bookingActions.ktmbCheck.title', {locale: $lang})}
                </Card.Title>
                <Card.Description>
                    {$_('bookingActions.ktmbCheck.description', {locale: $lang})}
                </Card.Description>
            </div>
            <Button variant={prominent ? "default" : "outline"} on:click={requestCheck} disabled={busy}>
                {#if busy}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {/if}
                {$_('bookingActions.ktmbCheck.button', {locale: $lang})}
            </Button>
        </div>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-3" aria-live="polite">
            {#if !loaded}
                <span class="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <LucideLoader class="h-4 w-4 animate-spin"/>
                    {$_('bookingActions.ktmbCheck.loading', {locale: $lang})}
                </span>
            {:else if loadFailed}
                <div class="text-sm text-destructive">{$_('bookingActions.ktmbCheck.loadFailed', {locale: $lang})}</div>
            {:else if view.kind === "none"}
                <div class="text-sm text-muted-foreground">{$_('bookingActions.ktmbCheck.notChecked', {locale: $lang})}</div>
            {:else if view.kind === "pending"}
                {#if view.timedOut}
                    <Badge class="bg-slate-500 w-fit">{$_('bookingActions.ktmbCheck.badge.noAnswer', {locale: $lang})}</Badge>
                    <div class="text-sm">
                        {$_('bookingActions.ktmbCheck.timedOut', {locale: $lang, values: {ago: ago(view.requestedAt)}})}
                    </div>
                {:else}
                    <Badge class="bg-amber-500 w-fit">
                        <LucideLoader class="mr-1 h-3 w-3 animate-spin"/>
                        {$_('bookingActions.ktmbCheck.badge.pending', {locale: $lang})}
                    </Badge>
                    <div class="text-sm text-muted-foreground">
                        {$_('bookingActions.ktmbCheck.waiting', {locale: $lang})}
                    </div>
                {/if}
            {:else if view.kind === "found"}
                <Badge class="{view.claim.kind === 'unclaimed' || view.claim.kind === 'unknown' ? 'bg-amber-500' : view.claim.kind === 'self' ? 'bg-green-500' : 'bg-purple-500'} w-fit">
                    {$_('bookingActions.ktmbCheck.badge.found', {locale: $lang})}
                </Badge>
                <div class="font-medium">{$_('bookingActions.ktmbCheck.found', {locale: $lang})}</div>
                <div class="flex flex-col text-sm">
                    <div>{$_('bookingActions.ktmbCheck.ktmbBookingNo', {locale: $lang, values: {value: view.ktmbBookingNo ?? "—"}})}</div>
                    <div>{$_('bookingActions.ktmbCheck.ktmbTicketNo', {locale: $lang, values: {value: view.ktmbTicketNo ?? "—"}})}</div>
                </div>
                <div class="text-sm">
                    {#if view.claim.kind === "unclaimed"}
                        {$_('bookingActions.ktmbCheck.claim.unclaimed', {locale: $lang})}
                    {:else if view.claim.kind === "unknown"}
                        <span class="text-destructive break-words">
                            {$_('bookingActions.ktmbCheck.claim.unknown', {locale: $lang, values: {error: view.claim.error}})}
                        </span>
                    {:else if view.claim.kind === "self"}
                        {$_('bookingActions.ktmbCheck.claim.self', {locale: $lang})}
                    {:else}
                        {$_('bookingActions.ktmbCheck.claim.other', {locale: $lang})}
                        <a href="/bookings/{view.claim.bookingId}" class="text-blue-600 hover:text-blue-800 underline">
                            {view.claim.bookingId}
                        </a>
                    {/if}
                </div>
            {:else if view.kind === "notFound"}
                <Badge class="bg-slate-500 w-fit">{$_('bookingActions.ktmbCheck.badge.notFound', {locale: $lang})}</Badge>
                <div class="font-medium">{$_('bookingActions.ktmbCheck.notFound', {locale: $lang})}</div>
            {:else if view.kind === "departed"}
                <Badge class="bg-slate-500 w-fit">{$_('bookingActions.ktmbCheck.badge.departed', {locale: $lang})}</Badge>
                <div class="font-medium">{$_('bookingActions.ktmbCheck.departed', {locale: $lang})}</div>
            {:else if view.kind === "error"}
                <Badge class="bg-red-500 w-fit">{$_('bookingActions.ktmbCheck.badge.error', {locale: $lang})}</Badge>
                <div class="font-medium">{$_('bookingActions.ktmbCheck.failed', {locale: $lang})}</div>
                {#if view.error}
                    <div class="text-sm text-destructive break-words">{view.error}</div>
                {/if}
            {/if}

            {#if check != null && check.checkedAt}
                <div class="text-xs text-muted-foreground">
                    {$_('bookingActions.ktmbCheck.checkedAt', {locale: $lang, values: {datetime: formatDateTime(check.checkedAt, $lang), ago: ago(check.checkedAt)}})}
                    {#if check.requestedBy}
                        · {$_('bookingActions.ktmbCheck.requestedBy', {locale: $lang, values: {user: check.requestedBy}})}
                    {/if}
                </div>
            {:else if check != null && view.kind === "pending"}
                <div class="text-xs text-muted-foreground">
                    {$_('bookingActions.ktmbCheck.requestedAt', {locale: $lang, values: {ago: ago(check.requestedAt)}})}
                    {#if check.requestedBy}
                        · {$_('bookingActions.ktmbCheck.requestedBy', {locale: $lang, values: {user: check.requestedBy}})}
                    {/if}
                </div>
            {/if}

            {#if booking.recoveryRetries != null || booking.firstRecoveringAt}
                <div class="border-t pt-3 flex flex-col text-sm text-muted-foreground">
                    {#if booking.recoveryRetries != null}
                        <div>{$_('bookingActions.ktmbCheck.recoveryRetries', {locale: $lang, values: {count: booking.recoveryRetries}})}</div>
                    {/if}
                    {#if booking.firstRecoveringAt}
                        <div>{$_('bookingActions.ktmbCheck.firstRecoveringAt', {locale: $lang, values: {datetime: formatDateTime(booking.firstRecoveringAt, $lang)}})}</div>
                    {/if}
                </div>
            {/if}
        </div>
    </Card.Content>
</Card.Root>
