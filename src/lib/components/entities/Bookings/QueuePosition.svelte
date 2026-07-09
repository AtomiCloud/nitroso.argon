<script lang="ts">
    import {onMount} from "svelte";
    import {page} from "$app/stores";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import type {BookingQueueRes} from "$lib/api/core/data-contracts";
    import {Button} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Tooltip from "$lib/components/ui/tooltip";
    import {Info, LucideLoader, PartyPopper, RotateCw, Users} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    // Live queue position for a booking that is still queued
    // (Pending/Buying/Recovering) — the PARENT decides when to render this.
    // Fetches GET Booking/{id}/queue on mount; manual refresh only, no polling.
    // When zinc reports the booking is no longer queued (position == null),
    // renders nothing.
    export let bookingId: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: session = $page.data.session as any;

    let queue: BookingQueueRes | null = null;
    let loading = false;
    let failed = false;

    // tap toggles the help tooltip on touch devices: hover-only tooltips are
    // unreachable on mobile; desktop keeps the native hover behavior
    let tipOpen = false;

    function tipPointerDown(e: PointerEvent & { originalEvent?: PointerEvent }) {
        const pe = e.originalEvent ?? e;
        if (pe.pointerType === 'touch') tipOpen = !tipOpen;
    }

    async function refresh() {
        loading = true;
        // Same guard as GET Booking/{id}: users must scope the read to their
        // own userId; admins may omit it.
        const userId = session?.roles?.includes('admin') ? undefined : ($page.data.user?.principal?.id ?? '');
        await toResult(() => $api.vBookingQueueDetail(bookingId, "1", {userId}),
            $_('bookingActions.queue.loadError', { locale: $lang })).match({
            ok: (q: BookingQueueRes) => {
                queue = q;
                failed = false;
            },
            err: (e) => {
                console.error(e);
                failed = true;
            }
        });
        loading = false;
    }

    onMount(refresh);

    $: isNext = queue?.position === 1;
</script>

{#if failed}
    <div class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>{$_('bookingActions.queue.loadError', { locale: $lang })}</span>
        <Button variant="ghost" size="icon" class="h-6 w-6" disabled={loading} on:click={refresh}
                aria-label={$_('bookingActions.queue.refresh', { locale: $lang })}>
            {#if loading}
                <LucideLoader class="h-3.5 w-3.5 animate-spin"/>
            {:else}
                <RotateCw class="h-3.5 w-3.5"/>
            {/if}
        </Button>
    </div>
{:else if queue == null}
    {#if loading}
        <div class="flex items-center justify-center text-muted-foreground">
            <LucideLoader class="h-4 w-4 animate-spin"/>
        </div>
    {/if}
{:else if queue.position != null && queue.total != null}
    <div class="flex items-center justify-center gap-2 text-sm">
        {#if isNext}
            <PartyPopper class="h-4 w-4 text-green-600 dark:text-green-400"/>
            <span class="font-medium text-green-600 dark:text-green-400">
                {$_('bookingActions.queue.next', { locale: $lang })}
            </span>
        {:else}
            <Users class="h-4 w-4 text-muted-foreground"/>
            <span>
                {$_('bookingActions.queue.position', { locale: $lang, values: { position: queue.position, total: queue.total } })}
            </span>
        {/if}
        <Tooltip.Root bind:open={tipOpen}>
            <Tooltip.Trigger on:pointerdown={tipPointerDown}>
                <Info class="h-4 w-4 text-muted-foreground"/>
            </Tooltip.Trigger>
            <Tooltip.Content class="max-w-72">
                <p class="text-justify">
                    {$_('bookingActions.queue.tooltip', { locale: $lang })}
                </p>
            </Tooltip.Content>
        </Tooltip.Root>
        <Button variant="ghost" size="icon" class="h-6 w-6" disabled={loading} on:click={refresh}
                aria-label={$_('bookingActions.queue.refresh', { locale: $lang })}>
            {#if loading}
                <LucideLoader class="h-3.5 w-3.5 animate-spin"/>
            {:else}
                <RotateCw class="h-3.5 w-3.5"/>
            {/if}
        </Button>
    </div>
{/if}
