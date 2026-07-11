<script lang="ts">
    import {Badge} from "$lib/components/ui/badge";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatNumber} from "$lib/i18n";
    import type {BookingStatRes} from "$lib/api/core/data-contracts";
    import {predictOdds, oddsClass, type OddsContext} from "$lib/stats/prediction";

    // ADMIN-only live odds chip for one /schedules slot row: the historical
    // refund-only success rate for this slot's CURRENT context, computed
    // client-side from the page's one cached stats fetch. Colored green ≥70 /
    // amber 40–70 / red <40; the InfoTip spells out the dimensions used, the
    // sample size, and which fallback level produced the number.
    export let rows: BookingStatRes[];
    export let ctx: OddsContext;
    // the slot's current lead-time bucket (display context only — the match
    // is on day/time/direction/demand, never lead)
    export let leadBucket: string;

    $: prediction = predictOdds(rows, ctx);

    $: dirText = $_(ctx.direction === "WToJ" ? 'stats.dir.wtoj' : 'stats.dir.jtow', { locale: $lang });
    $: dayText = $_(`stats.daysShort.${ctx.dayOfWeek.toLowerCase()}`, { locale: $lang });
    $: timeText = ctx.time.slice(0, 5);
</script>

<span class="flex items-center gap-0.5">
    {#if prediction == null}
        <Badge variant="outline" class="text-center text-muted-foreground">
            {$_('schedules.odds.na', { locale: $lang })}
        </Badge>
        <InfoTip label={$_('schedules.odds.label', { locale: $lang })}>
            {$_('schedules.odds.infoNa', { locale: $lang, values: { time: timeText, direction: dirText } })}
        </InfoTip>
    {:else}
        <Badge class="text-center whitespace-nowrap {oddsClass(prediction.rate)}">
            ~{formatNumber(prediction.rate, $lang, { maximumFractionDigits: 0 })}%
            · {formatNumber(prediction.num, $lang)}/{formatNumber(prediction.den, $lang)}
        </Badge>
        <InfoTip label={$_('schedules.odds.label', { locale: $lang })}>
            {$_(`schedules.odds.info${prediction.level}`, {
                locale: $lang,
                values: { day: dayText, time: timeText, direction: dirText, demand: ctx.demandBucket },
            })}
            {$_('schedules.odds.sample', {
                locale: $lang,
                values: { num: formatNumber(prediction.num, $lang), den: formatNumber(prediction.den, $lang) },
            })}
            {$_('schedules.odds.context', {
                locale: $lang,
                values: { demand: ctx.demandBucket, lead: leadBucket },
            })}
        </InfoTip>
    {/if}
</span>
