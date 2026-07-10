<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Table from "$lib/components/ui/table";
    import {_} from "svelte-i18n";
    import {lang, formatNumber} from "$lib/i18n";
    import {DIR_TINT, rateClass, barClass, rateText, type StatRow} from "./stats";

    // One breakdown table: Group | Total | Success % (+ raw n/d + div bar).
    // Rows with a direction carry the page-wide direction TINT (see legend).
    export let title: string;
    export let rows: StatRow[];
</script>

<Card.Root>
    <Card.Header class="p-4 sm:p-6">
        <Card.Title class="flex items-center gap-2">
            {title}
            <slot name="info"/>
        </Card.Title>
        {#if $$slots.description}
            <Card.Description>
                <slot name="description"/>
            </Card.Description>
        {/if}
    </Card.Header>
    <Card.Content class="px-2 sm:px-6">
        {#if rows.length === 0}
            <p class="text-sm text-muted-foreground px-2">{$_('stats.empty', { locale: $lang })}</p>
        {:else}
            <div class="overflow-x-auto">
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head class="h-9 px-2">{$_('stats.table.group', { locale: $lang })}</Table.Head>
                            <Table.Head class="h-9 px-2 text-right">{$_('stats.table.total', { locale: $lang })}</Table.Head>
                            <Table.Head class="h-9 px-2">{$_('stats.table.rate', { locale: $lang })}</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each rows as r (r.key)}
                            <Table.Row class={r.dir ? DIR_TINT[r.dir] : ""}>
                                <Table.Cell class="px-2 py-1.5 font-medium whitespace-nowrap">{r.label}</Table.Cell>
                                <Table.Cell class="px-2 py-1.5 text-right">{formatNumber(r.total, $lang)}</Table.Cell>
                                <Table.Cell class="px-2 py-1.5">
                                    <div class="flex items-center gap-2 whitespace-nowrap">
                                        <span class="w-12 sm:w-14 text-right font-medium {rateClass(r.rate)}">{rateText(r.rate, $lang)}</span>
                                        <div class="h-1.5 w-12 sm:w-24 rounded bg-muted overflow-hidden">
                                            {#if r.rate != null}
                                                <div class="h-full {barClass(r.rate)}" style="width: {r.rate}%"></div>
                                            {/if}
                                        </div>
                                        <!-- raw numerator/denominator (actuarial base) -->
                                        <span class="text-[10px] text-muted-foreground tabular-nums">{formatNumber(r.num, $lang)}/{formatNumber(r.den, $lang)}</span>
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
