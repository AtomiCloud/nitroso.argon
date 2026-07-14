<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    import {Button} from "$lib/components/ui/button";
    import {Input} from "$lib/components/ui/input";
    import {LucideLoader, LucidePlus} from "lucide-svelte";
    import type {Selected} from "bits-ui";
    import type {KtmbCostRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {onMount} from "svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatDateTime} from "$lib/i18n";
    import {DIRECTIONS} from "$lib/stats/buckets";
    import {currentRows, ktmbDraftToReq, validateKtmbDraft, type KtmbDraftErrors} from "./ktmb-cost";

    // Admin card for the KTMB ticket cost (zinc PR #39): the current
    // effective cost per direction, the queued future changes, and an
    // "Add change" dialog — the same current + queue + effective-dated add
    // shape as the /fees fee-queue cards. Insert-only on zinc's side: queued
    // changes cannot be cancelled (unlike fees), so no checkboxes here.
    // Loads itself on mount (the /costs loader stays untouched); failures
    // degrade to an inline retry, never a page error.

    let res: KtmbCostRes | null = null;
    let loadFailed = false;

    async function load() {
        loadFailed = false;
        await toResult(() => $api.vBookingKtmbCostCurrentDetail("1"),
            $_('admin.costs.ktmb.loadError', {locale: $lang})).match({
            ok: (r: KtmbCostRes) => {
                res = r;
            },
            err: (e) => {
                console.error(e);
                loadFailed = true;
            }
        });
    }

    onMount(load);

    function directionLabel(v: string): string {
        return $_(v === "WToJ" ? 'bookings.list.woodlandsToJb' : 'bookings.list.jbToWoodlands', {locale: $lang});
    }

    // ---- add-change dialog ----
    let dialogOpen = false;
    let submitting = false;
    let errors: KtmbDraftErrors = {};
    let taints: Record<string, boolean> = {};

    let selDirection: Selected<string> | undefined;
    const draft = {direction: "", cost: "", effectiveAt: ""};

    // keep the closed-trigger label in the active locale
    $: if (selDirection?.value) {
        const l = directionLabel(selDirection.value);
        if (selDirection.label !== l) selDirection = {...selDirection, label: l};
    }

    // "now" formatted for a datetime-local `min` attribute (local timezone,
    // minute precision); refreshed each time the dialog opens
    function nowLocalMinute(): string {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    let effectiveMin = nowLocalMinute();

    function openDialog(direction?: string) {
        selDirection = direction == null ? undefined : {value: direction, label: directionLabel(direction)};
        draft.direction = direction ?? "";
        // seed with that direction's current cost, if configured
        const cur = direction != null && res != null && direction in res.current ? res.current[direction] : null;
        draft.cost = cur == null ? "" : String(Number(cur.toFixed(2)));
        draft.effectiveAt = "";
        effectiveMin = nowLocalMinute();
        errors = {};
        taints = {};
        dialogOpen = true;
    }

    function revalidate(path: string) {
        taints[path] = true;
        draft.direction = selDirection?.value ?? "";
        errors = validateKtmbDraft(draft);
    }

    function errText(path: keyof KtmbDraftErrors): string {
        const code = errors[path];
        return code == null || !taints[path] ? "" : $_(`admin.costs.ktmb.${code}`, {locale: $lang});
    }

    async function submit() {
        for (const p of ["direction", "cost", "effectiveAt"]) revalidate(p);
        if (Object.keys(errors).length !== 0) return;

        const body = ktmbDraftToReq(draft);
        // decided from what we send, not the response, so server clock skew
        // can never make an immediate change look scheduled (or vice versa)
        const scheduled = body.effectiveAt != null && new Date(body.effectiveAt).getTime() > Date.now();
        submitting = true;
        await toResult(() => $api.vBookingKtmbCostCreate("1", body),
            $_('admin.costs.ktmb.saveError', {locale: $lang})).match({
            ok: (c) => {
                if (scheduled) {
                    toast.info($_('admin.costs.ktmb.scheduledSuccess', {
                        locale: $lang,
                        values: {date: formatDateTime(c.effectiveAt, $lang)},
                    }));
                } else {
                    toast.info($_('admin.costs.ktmb.saveSuccess', {locale: $lang}));
                }
                dialogOpen = false;
                load();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        submitting = false;
    }
</script>

<Card.Root class="my-4">
    <Card.Header>
        <div class="flex flex-wrap justify-between items-start gap-4">
            <div class="flex flex-col gap-1">
                <Card.Title>{$_('admin.costs.ktmb.title', {locale: $lang})}</Card.Title>
                <Card.Description>{$_('admin.costs.ktmb.description', {locale: $lang})}</Card.Description>
            </div>
            <Button variant="outline" on:click={() => openDialog()}>
                <LucidePlus class="mr-2 h-4 w-4"/>
                {$_('admin.costs.ktmb.addTrigger', {locale: $lang})}
            </Button>
        </div>
    </Card.Header>
    <Card.Content>
        {#if loadFailed}
            <div class="flex items-center gap-2">
                <div class="text-sm text-destructive">{$_('admin.costs.ktmb.loadError', {locale: $lang})}</div>
                <Button variant="outline" size="sm" on:click={load}>
                    {$_('actions.retry', {locale: $lang})}
                </Button>
            </div>
        {:else if res == null}
            <LucideLoader class="h-4 w-4 animate-spin"/>
        {:else}
            <div class="flex flex-col gap-4">
                <!-- current cost per direction (both rows always) -->
                <div class="flex flex-col gap-2">
                    <div class="text-sm font-medium">{$_('admin.costs.ktmb.currentTitle', {locale: $lang})}</div>
                    {#each currentRows(res, DIRECTIONS) as row (row.direction)}
                        <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                            <span class="text-sm">{directionLabel(row.direction)}</span>
                            {#if row.cost == null}
                                <span class="text-sm text-muted-foreground">{$_('admin.costs.ktmb.notConfigured', {locale: $lang})}</span>
                            {:else}
                                <span class="font-semibold tabular-nums">{formatMoney(row.cost, $lang)}</span>
                            {/if}
                        </div>
                    {/each}
                </div>
                <!-- queued future changes (insert-only; soonest first from zinc) -->
                <div class="flex flex-col gap-2">
                    <div class="text-sm font-medium">{$_('admin.costs.ktmb.queueTitle', {locale: $lang})}</div>
                    {#if res.upcoming.length === 0}
                        <div class="text-sm text-muted-foreground">{$_('admin.costs.ktmb.queueEmpty', {locale: $lang})}</div>
                    {:else}
                        {#each res.upcoming as c (c.id)}
                            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border p-3 text-sm">
                                {$_('admin.costs.ktmb.queueLine', {
                                    locale: $lang,
                                    values: {
                                        direction: directionLabel(c.direction),
                                        cost: formatMoney(c.cost, $lang),
                                        date: formatDateTime(c.effectiveAt, $lang),
                                    },
                                })}
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        {/if}
    </Card.Content>
</Card.Root>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('admin.costs.ktmb.addTitle', {locale: $lang})}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">{$_('admin.costs.ktmb.addIntro', {locale: $lang})}</p>
                    <div class="flex flex-col gap-2">
                        <div class="text-sm font-medium">{$_('admin.costs.ktmb.directionLabel', {locale: $lang})}</div>
                        <Select.Root bind:selected={selDirection} onSelectedChange={() => revalidate("direction")}>
                            <Select.Trigger>
                                <Select.Value placeholder={$_('admin.costs.ktmb.pickDirection', {locale: $lang})}/>
                            </Select.Trigger>
                            <Select.Content>
                                {#each DIRECTIONS as d (d)}
                                    <Select.Item value={d}>{directionLabel(d)}</Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        {#if errText("direction")}
                            <p class="text-sm text-destructive">{errText("direction")}</p>
                        {/if}
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium" for="ktmb-cost">
                            {$_('admin.costs.ktmb.costLabel', {locale: $lang})}
                        </label>
                        <div class="flex items-center gap-2">
                            <div class="text-lg text-primary">S$</div>
                            <Input id="ktmb-cost"
                                   class="flex-1"
                                   placeholder={$_('admin.costs.ktmb.costPlaceholder', {locale: $lang})}
                                   inputmode="decimal"
                                   bind:value={draft.cost}
                                   on:input={() => revalidate("cost")}/>
                        </div>
                        {#if errText("cost")}
                            <p class="text-sm text-destructive">{errText("cost")}</p>
                        {/if}
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium" for="ktmb-effective-at">
                            {$_('admin.costs.ktmb.effectiveFrom', {locale: $lang})}
                        </label>
                        <Input id="ktmb-effective-at"
                               type="datetime-local"
                               min={effectiveMin}
                               bind:value={draft.effectiveAt}
                               on:input={() => revalidate("effectiveAt")}/>
                        <div class="text-sm text-muted-foreground">{$_('admin.costs.ktmb.effectiveHint', {locale: $lang})}</div>
                        {#if errText("effectiveAt")}
                            <p class="text-sm text-destructive">{errText("effectiveAt")}</p>
                        {/if}
                    </div>
                    <Button class="my-2" on:click={submit} disabled={submitting || Object.keys(errors).length !== 0}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('admin.costs.ktmb.save', {locale: $lang})}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
