<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import {formatNumber, lang} from "$lib/i18n";
    import {_} from "svelte-i18n";
    import {barClass, rateText, type StatRow} from "./stats";

    export let title: string;
    export let description = "";
    export let rows: StatRow[] = [];
    export let selectedKey: string | undefined = undefined;

    function height(rate: number | null): number {
        if (rate == null) return 0;
        return Math.max(2, Math.min(100, rate));
    }
</script>

<Card.Root>
    <Card.Header class="p-4 sm:p-6">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
                <Card.Title>{title}</Card.Title>
                {#if description}
                    <Card.Description class="mt-1">{description}</Card.Description>
                {/if}
            </div>
            <slot name="info"/>
        </div>
    </Card.Header>
    <Card.Content class="px-2 pb-4 sm:px-6 sm:pb-6">
        {#if rows.length === 0}
            <p class="px-2 text-sm text-muted-foreground">{$_('stats.empty', {locale: $lang})}</p>
        {:else}
            <div class="overflow-x-auto pb-2">
                <div class="relative h-64 min-w-full w-max border-b border-l border-border/70 px-2 pt-5"
                     role="img"
                     aria-label={title}>
                    <!-- A quiet instrument-panel grid: enough structure to read
                         rates quickly without turning the operational chart into
                         decoration. -->
                    {#each [25, 50, 75, 100] as mark}
                        <div class="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/45"
                             style={`bottom: ${mark * 1.72 + 44}px`}>
                            <span class="absolute left-1 -translate-y-full bg-background/80 px-1 text-[10px] tabular-nums text-muted-foreground">
                                {mark}%
                            </span>
                        </div>
                    {/each}

                    <ol class="relative z-10 flex h-full items-end gap-2 sm:gap-3">
                        {#each rows as row (row.key)}
                            <li class="group flex h-full w-[4.5rem] shrink-0 flex-col justify-end sm:w-20"
                                class:ring-2={selectedKey === row.key}
                                class:ring-primary={selectedKey === row.key}
                                class:rounded-md={selectedKey === row.key}
                                aria-label={`${row.label}: ${rateText(row.rate, $lang)}, ${formatNumber(row.num, $lang)} of ${formatNumber(row.den, $lang)}`}>
                                <div class="mb-1 text-center text-xs font-semibold tabular-nums">
                                    {rateText(row.rate, $lang)}
                                </div>
                                <div class="mx-auto flex h-[10.75rem] w-9 items-end overflow-hidden rounded-t-md bg-muted/70 sm:w-10">
                                    {#if row.rate != null}
                                        <div class="w-full rounded-t-md transition-[height,filter] duration-300 group-hover:brightness-110 {barClass(row.rate)}"
                                             style={`height: ${height(row.rate)}%`}>
                                        </div>
                                    {/if}
                                </div>
                                <div class="flex h-11 items-start justify-center border-t border-border/60 px-1 pt-1 text-center text-[11px] font-medium leading-tight">
                                    {row.label}
                                </div>
                                <div class="pb-1 text-center text-[10px] tabular-nums text-muted-foreground">
                                    {formatNumber(row.num, $lang)}/{formatNumber(row.den, $lang)}
                                </div>
                            </li>
                        {/each}
                    </ol>
                </div>
            </div>
        {/if}
    </Card.Content>
</Card.Root>
