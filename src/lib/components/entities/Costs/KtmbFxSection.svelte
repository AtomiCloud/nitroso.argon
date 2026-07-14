<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    import {Button} from "$lib/components/ui/button";
    import {Input} from "$lib/components/ui/input";
    import {LucideLoader, LucidePlus} from "lucide-svelte";
    import type {KtmbFxRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {onMount} from "svelte";
    import {_} from "svelte-i18n";
    import {lang, formatDateTime} from "$lib/i18n";
    import {ktmbFxDraftToReq, validateKtmbFxDraft, type KtmbFxDraftErrors} from "./ktmb-fx";

    // Admin card for the MYR→SGD FX rate (zinc ktmb actual cost): the rate in
    // effect right now (SGD per 1 MYR), the recent rate rows, and an "Add rate"
    // dialog — the same insert-only, effective-dated shape as the KTMB cost
    // queue. Zinc uses this rate to convert each booking's actual recorded KTMB
    // cost from MYR into SGD. Loads itself on mount (the /costs loader stays
    // untouched); failures degrade to an inline retry, never a page error.

    let res: KtmbFxRes | null = null;
    let loadFailed = false;

    async function load() {
        loadFailed = false;
        await toResult(() => $api.vBookingKtmbFxDetail("1"),
            $_('admin.costs.ktmbFx.loadError', {locale: $lang})).match({
            ok: (r: KtmbFxRes) => {
                res = r;
            },
            err: (e) => {
                console.error(e);
                loadFailed = true;
            }
        });
    }

    onMount(load);

    // ---- add-rate dialog ----
    let dialogOpen = false;
    let submitting = false;
    let errors: KtmbFxDraftErrors = {};
    let taints: Record<string, boolean> = {};

    const draft = {rate: "", effectiveAt: ""};

    // "now" rounded UP to the next whole minute, formatted for a
    // datetime-local `min` attribute (local timezone). Rounding up keeps the
    // picker's floor strictly in the future, matching validateKtmbFxDraft's
    // strict future-time rule even mid-minute. Refreshed each time the dialog
    // opens.
    function nowLocalMinute(): string {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 1, 0, 0);
        return d.toISOString().slice(0, 16);
    }

    let effectiveMin = nowLocalMinute();

    function openDialog() {
        // seed with the current rate, if configured
        draft.rate = res?.current == null ? "" : String(res.current.rate);
        draft.effectiveAt = "";
        effectiveMin = nowLocalMinute();
        errors = {};
        taints = {};
        dialogOpen = true;
    }

    function revalidate(path: string) {
        taints[path] = true;
        errors = validateKtmbFxDraft(draft);
    }

    function errText(path: keyof KtmbFxDraftErrors): string {
        const code = errors[path];
        return code == null || !taints[path] ? "" : $_(`admin.costs.ktmbFx.${code}`, {locale: $lang});
    }

    async function submit() {
        for (const p of ["rate", "effectiveAt"]) revalidate(p);
        if (Object.keys(errors).length !== 0) return;

        const body = ktmbFxDraftToReq(draft);
        // decided from what we send, not the response, so server clock skew
        // can never make an immediate change look scheduled (or vice versa)
        const scheduled = body.effectiveAt != null && new Date(body.effectiveAt).getTime() > Date.now();
        submitting = true;
        await toResult(() => $api.vBookingKtmbFxCreate("1", body),
            $_('admin.costs.ktmbFx.saveError', {locale: $lang})).match({
            ok: (c) => {
                if (scheduled) {
                    toast.info($_('admin.costs.ktmbFx.scheduledSuccess', {
                        locale: $lang,
                        values: {date: formatDateTime(c.effectiveAt, $lang)},
                    }));
                } else {
                    toast.info($_('admin.costs.ktmbFx.saveSuccess', {locale: $lang}));
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
                <Card.Title>{$_('admin.costs.ktmbFx.title', {locale: $lang})}</Card.Title>
                <Card.Description>{$_('admin.costs.ktmbFx.description', {locale: $lang})}</Card.Description>
            </div>
            <Button variant="outline" on:click={openDialog}>
                <LucidePlus class="mr-2 h-4 w-4"/>
                {$_('admin.costs.ktmbFx.addTrigger', {locale: $lang})}
            </Button>
        </div>
    </Card.Header>
    <Card.Content>
        {#if loadFailed}
            <div class="flex items-center gap-2">
                <div class="text-sm text-destructive">{$_('admin.costs.ktmbFx.loadError', {locale: $lang})}</div>
                <Button variant="outline" size="sm" on:click={load}>
                    {$_('actions.retry', {locale: $lang})}
                </Button>
            </div>
        {:else if res == null}
            <LucideLoader class="h-4 w-4 animate-spin"/>
        {:else}
            <div class="flex flex-col gap-4">
                <!-- rate in effect right now -->
                <div class="flex flex-col gap-2">
                    <div class="text-sm font-medium">{$_('admin.costs.ktmbFx.currentTitle', {locale: $lang})}</div>
                    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                        {#if res.current == null}
                            <span class="text-sm text-muted-foreground">{$_('admin.costs.ktmbFx.notConfigured', {locale: $lang})}</span>
                        {:else}
                            <span class="font-semibold tabular-nums">
                                {$_('admin.costs.ktmbFx.rateValue', {locale: $lang, values: {rate: String(res.current.rate)}})}
                            </span>
                            <span class="text-sm text-muted-foreground">
                                {$_('admin.costs.ktmbFx.effectiveSince', {
                                    locale: $lang,
                                    values: {date: formatDateTime(res.current.effectiveAt, $lang)},
                                })}
                            </span>
                        {/if}
                    </div>
                </div>
                <!-- recent rate rows (insert-only; newest first from zinc) -->
                <div class="flex flex-col gap-2">
                    <div class="text-sm font-medium">{$_('admin.costs.ktmbFx.recentTitle', {locale: $lang})}</div>
                    {#if res.recent.length === 0}
                        <div class="text-sm text-muted-foreground">{$_('admin.costs.ktmbFx.recentEmpty', {locale: $lang})}</div>
                    {:else}
                        {#each res.recent as r (r.createdAt)}
                            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border p-3 text-sm">
                                {$_('admin.costs.ktmbFx.recentLine', {
                                    locale: $lang,
                                    values: {
                                        rate: String(r.rate),
                                        date: formatDateTime(r.effectiveAt, $lang),
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
            <Dialog.Title>{$_('admin.costs.ktmbFx.addTitle', {locale: $lang})}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">{$_('admin.costs.ktmbFx.addIntro', {locale: $lang})}</p>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium" for="ktmb-fx-rate">
                            {$_('admin.costs.ktmbFx.rateLabel', {locale: $lang})}
                        </label>
                        <div class="flex items-center gap-2">
                            <div class="text-lg text-primary">S$</div>
                            <Input id="ktmb-fx-rate"
                                   class="flex-1"
                                   placeholder={$_('admin.costs.ktmbFx.ratePlaceholder', {locale: $lang})}
                                   inputmode="decimal"
                                   bind:value={draft.rate}
                                   on:input={() => revalidate("rate")}/>
                        </div>
                        {#if errText("rate")}
                            <p class="text-sm text-destructive">{errText("rate")}</p>
                        {/if}
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium" for="ktmb-fx-effective-at">
                            {$_('admin.costs.ktmbFx.effectiveFrom', {locale: $lang})}
                        </label>
                        <Input id="ktmb-fx-effective-at"
                               type="datetime-local"
                               min={effectiveMin}
                               bind:value={draft.effectiveAt}
                               on:input={() => revalidate("effectiveAt")}/>
                        <div class="text-sm text-muted-foreground">{$_('admin.costs.ktmbFx.effectiveHint', {locale: $lang})}</div>
                        {#if errText("effectiveAt")}
                            <p class="text-sm text-destructive">{errText("effectiveAt")}</p>
                        {/if}
                    </div>
                    <Button class="my-2" on:click={submit} disabled={submitting}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('admin.costs.ktmbFx.save', {locale: $lang})}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
