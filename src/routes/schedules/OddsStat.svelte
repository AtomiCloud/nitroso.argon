<script lang="ts">
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import {Check, X} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatNumber} from "$lib/i18n";
    import type {BookingStatRes} from "$lib/api/core/data-contracts";
    import {
        predictOdds,
        oddsConfidence,
        oddsClass,
        oddsTextClass,
        oddsTrackClass,
        type OddsContext,
    } from "$lib/stats/prediction";

    // ADMIN-only live odds stat block for one /schedules slot row: the
    // historical refund-only success rate for this slot's CURRENT context,
    // computed client-side from the page's one cached stats fetch. A bold
    // rate-colored percentage over a thin meter bar, with a muted sample +
    // confidence line; the InfoTip is a per-dimension ✓/✗ data-coverage
    // checklist (day / time / direction / demand / lead), never prose.
    export let rows: BookingStatRes[];
    export let ctx: OddsContext;
    // label of the milestone that anchors the stats range; null = the
    // last-30-days fallback range
    export let rangeMilestone: string | null = null;

    $: prediction = predictOdds(rows, ctx);
    $: confidence = prediction == null ? null : oddsConfidence(prediction);

    // checklist rows: (time, direction) are matched whenever anything
    // resolved; the optional dims come from the resolving level
    $: checks = [
        {key: "day", ok: prediction?.matched.day ?? false, current: null as string | null},
        {key: "time", ok: prediction != null, current: null},
        {key: "direction", ok: prediction != null, current: null},
        {key: "demand", ok: prediction?.matched.demand ?? false, current: ctx.demandBucket},
        {key: "lead", ok: prediction?.matched.lead ?? false, current: null},
    ];

    $: rangeText = rangeMilestone != null
        ? $_('schedules.odds.rangeMilestone', {locale: $lang, values: {label: rangeMilestone}})
        : $_('schedules.odds.rangeLast30', {locale: $lang});
</script>

<span class="flex items-center">
    {#if prediction == null}
        <span class="text-sm leading-none text-muted-foreground">
            {$_('schedules.odds.na', { locale: $lang })}
        </span>
    {:else}
        <span class="flex w-16 flex-col items-center gap-1">
            <span class="text-base font-bold leading-none tabular-nums {oddsTextClass(prediction.rate)}">
                ~{formatNumber(prediction.rate, $lang, { maximumFractionDigits: 0 })}%
            </span>
            <span class="h-1 w-full overflow-hidden rounded-full {oddsTrackClass(prediction.rate)}"
                  role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(prediction.rate)}
                  aria-label={$_('schedules.odds.label', { locale: $lang })}>
                <span class="block h-full rounded-full {oddsClass(prediction.rate)}"
                      style="width: {prediction.rate}%"></span>
            </span>
            <span class="whitespace-nowrap text-xs leading-none text-muted-foreground">
                {formatNumber(prediction.num, $lang)}/{formatNumber(prediction.den, $lang)}
                · {$_(`schedules.odds.confidence.${confidence}`, { locale: $lang })}
            </span>
        </span>
    {/if}
    <InfoTip label={$_('schedules.odds.label', { locale: $lang })}>
        {#each checks as c}
            <span class="flex items-center gap-1.5 text-left">
                {#if c.ok}
                    <Check class="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true"/>
                {:else}
                    <X class="h-3 w-3 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true"/>
                {/if}
                <span class="sr-only">
                    {$_(c.ok ? 'schedules.odds.matched' : 'schedules.odds.unmatched', { locale: $lang })}
                </span>
                <span>
                    {$_(`schedules.odds.check.${c.key}`, { locale: $lang })}{#if c.current != null}
                        {' '}({$_('schedules.odds.current', { locale: $lang, values: { value: c.current } })}){/if}
                </span>
            </span>
        {/each}
        <span class="mt-1 block text-left text-muted-foreground">
            {$_('schedules.odds.sample', {
                locale: $lang,
                values: {
                    num: formatNumber(prediction?.num ?? 0, $lang),
                    den: formatNumber(prediction?.den ?? 0, $lang),
                },
            })}
            · {rangeText}
        </span>
    </InfoTip>
</span>
