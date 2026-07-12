<script lang="ts">
    import type {AnnounceFeeReq, FeeChangeRes, FeeRes, WithdrawalSettingsRes} from "$lib/api/core/data-contracts";
    import {api} from "../../store";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";

    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";

    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    import type {Selected} from "bits-ui";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {onMount, tick} from "svelte";
    import {AlertTriangle, LucideLoader, LucideMail, LucidePlus} from "lucide-svelte";
    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {Checkbox} from "$lib/components/ui/checkbox";
    import {Switch} from "$lib/components/ui/switch";
    import {Input} from "$lib/components/ui/input";
    import {Textarea} from "$lib/components/ui/textarea";
    import Validation from "$lib/components/core/Validation.svelte";
    import {describeFee, loadFee, type FeeType} from "$lib/api/fee";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatDateTime} from "$lib/i18n";

    // Fee queue manager (admin-only, same server-side gating as /discounts —
    // zinc rejects non-admin reads of the queue and all writes; the nav link
    // is only rendered for admins). Each fee type carries a QUEUE of scheduled
    // changes; the live fee is whatever change was last to become effective.
    const FEE_TYPES: FeeType[] = ["Withdrawal", "Deposit", "Termination"];

    // current fee per type (flat SGD + percentage + optional cap; 0 + 0 = no fee)
    let fees: Record<FeeType, FeeRes | null> = {Withdrawal: null, Deposit: null, Termination: null};
    let feeLoadFailed: Record<FeeType, boolean> = {Withdrawal: false, Deposit: false, Termination: false};

    // scheduled future changes per type (soonest first, from GET Fee/{type}/upcoming)
    let queues: Record<FeeType, FeeChangeRes[]> = {Withdrawal: [], Deposit: [], Termination: []};
    let queueLoadFailed: Record<FeeType, boolean> = {Withdrawal: false, Deposit: false, Termination: false};

    // per-event checkbox selection (explicit requirement): id -> checked
    let selected: Record<FeeType, Record<string, boolean>> = {Withdrawal: {}, Deposit: {}, Termination: {}};

    onMount(() => {
        for (const t of FEE_TYPES) reload(t);
        loadWithdrawalSettings();
    })

    // ---- withdrawal settings (method policy + payout sweep) ----
    // GET settings/current on load; the three controls edit a local draft and
    // Save POSTs the whole shape, then re-reads the server's answer.
    const PAYNOW_MODES = ["Enabled", "Disabled", "FallbackOnly"] as const;

    let wSettings: WithdrawalSettingsRes | null = null;
    let wSettingsFailed = false;
    let wSaving = false;

    // draft edited by the controls (seeded from the loaded settings)
    let wCardRefundEnabled = true;
    let wSweepEnabled = false;
    let wPayNowMode: Selected<string> = {value: "FallbackOnly", label: ""};

    // keep the closed-trigger label localized after a language switch
    $: if (wPayNowMode?.value) {
        const translated = $_(`fees.withdrawalSettings.modes.${wPayNowMode.value}.label`, { locale: $lang });
        if (wPayNowMode.label !== translated) wPayNowMode = { ...wPayNowMode, label: translated };
    }

    function seedWithdrawalDraft(s: WithdrawalSettingsRes) {
        wCardRefundEnabled = s.cardRefundEnabled;
        wSweepEnabled = s.sweepEnabled;
        // guard against a mode this UI predates: fall back to zinc's default
        const mode = (PAYNOW_MODES as readonly string[]).includes(s.payNowMode) ? s.payNowMode : "FallbackOnly";
        wPayNowMode = {value: mode, label: $_(`fees.withdrawalSettings.modes.${mode}.label`, { locale: $lang })};
    }

    async function loadWithdrawalSettings() {
        wSettingsFailed = false;
        await toResult(() => $api.vWithdrawalSettingsCurrentDetail("1.0"),
            $_('fees.withdrawalSettings.loadFailed', { locale: $lang })).match({
            ok: (s) => {
                wSettings = s;
                seedWithdrawalDraft(s);
            },
            err: (e) => {
                console.error(e);
                wSettingsFailed = true;
            }
        })
    }

    async function saveWithdrawalSettings() {
        wSaving = true;
        await toResult(() => $api.vWithdrawalSettingsCreate("1.0", {
            cardRefundEnabled: wCardRefundEnabled,
            payNowMode: wPayNowMode?.value ?? "FallbackOnly",
            sweepEnabled: wSweepEnabled,
        }), $_('fees.withdrawalSettings.saveError', { locale: $lang })).match({
            ok: () => {
                toast.info($_('fees.withdrawalSettings.saveSuccess', { locale: $lang }));
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        // re-read the authoritative state either way (a concurrent admin may
        // have raced us; on error the draft snaps back to what is live)
        await loadWithdrawalSettings();
        wSaving = false;
    }

    function reload(t: FeeType) {
        loadCurrent(t);
        loadQueue(t);
    }

    async function loadCurrent(t: FeeType) {
        feeLoadFailed[t] = false;
        fees[t] = await loadFee($api, t, $_('fees.section.loadFailed', { locale: $lang }));
        feeLoadFailed[t] = fees[t] == null;
    }

    async function loadQueue(t: FeeType) {
        queueLoadFailed[t] = false;
        await toResult(() => $api.vFeeUpcomingDetail(t, "1.0"),
            $_('fees.queue.loadFailed', { locale: $lang })).match({
            ok: (u) => {
                queues[t] = u;
                // drop selections for events no longer queued
                const ids = new Set(u.map(c => c.id));
                selected[t] = Object.fromEntries(Object.entries(selected[t]).filter(([id]) => ids.has(id)));
            },
            err: (e) => {
                console.error(e);
                queueLoadFailed[t] = true;
            }
        })
    }

    // number of checked queue rows per type, recomputed on any checkbox change
    $: selectedCounts = {
        Withdrawal: Object.values(selected.Withdrawal).filter(Boolean).length,
        Deposit: Object.values(selected.Deposit).filter(Boolean).length,
        Termination: Object.values(selected.Termination).filter(Boolean).length,
    } as Record<FeeType, number>;

    // ---- cancel-selected (DELETE per checked id, behind a confirm dialog) ----
    let cancelDialogOpen = false;
    let cancelTarget: FeeType = "Withdrawal";
    let cancelling = false;

    function openCancelDialog(t: FeeType) {
        cancelTarget = t;
        cancelDialogOpen = true;
    }

    async function cancelSelected() {
        const ids = Object.entries(selected[cancelTarget]).filter(([, v]) => v).map(([id]) => id);
        if (ids.length === 0) return;
        cancelling = true;
        let ok = 0;
        let failed = 0;
        for (const id of ids) {
            await toResult(() => $api.vFeeDelete(id, "1.0"),
                $_('fees.queue.cancelError', { locale: $lang })).match({
                ok: () => {
                    ok += 1;
                },
                err: (e) => {
                    // e.g. 404 when the event became effective while selected
                    console.error(e);
                    failed += 1;
                }
            })
        }
        if (failed === 0) {
            toast.info($_('fees.queue.cancelSuccess', { locale: $lang, values: { count: ok } }));
        } else {
            toast.error($_('fees.queue.cancelPartial', { locale: $lang, values: { count: ok, failed } }));
        }
        // reload both the queue and the live fee — an event may have become
        // effective (hence the 404) while the admin was selecting
        reload(cancelTarget);
        cancelDialogOpen = false;
        cancelling = false;
    }

    // ---- add-change dialog — mirrors the page's usual zod + Validation pattern ----
    let addDialogOpen = false;
    let addTarget: FeeType = "Withdrawal";
    let addSubmitting = false;
    let addErrors: ZodIssue[] = [];
    let addTaints: Record<string, boolean> = {}

    const addVal = {
        percentage: "",
        flatAmount: "",
        // optional cap in SGD (max 2 decimals); "" = uncapped
        cap: "",
        // datetime-local string in the admin's local timezone; "" = immediate
        effectiveAt: "",
    }

    // "now" formatted for a datetime-local `min` attribute (local timezone,
    // minute precision); refreshed each time the dialog opens
    function nowLocalMinute(): string {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    let addEffectiveMin = nowLocalMinute();

    const twoDecimals = (x: number) => {
        const r = x.toString().split(".")
        if (r.length == 2) return r[1].length <= 2
        return true;
    }

    // requires a non-empty input before coercing: z.coerce.number() turns ""
    // into 0, and 0 is a meaningful (fee-removing) value here, so an
    // accidentally cleared field must not silently remove the fee
    $: setFeeSchema = z.object({
        percentage: z
            .string()
            .trim()
            .min(1, $_('fees.add.percentRange', { locale: $lang }))
            .pipe(z
                .coerce
                .number()
                .min(0, $_('fees.add.percentRange', { locale: $lang }))
                .max(100, $_('fees.add.percentRange', { locale: $lang }))
                .finite($_('fees.add.finite', { locale: $lang }))
                .refine(twoDecimals, $_('fees.add.precision', { locale: $lang }))),
        flatAmount: z
            .string()
            .trim()
            .min(1, $_('fees.add.flatRange', { locale: $lang }))
            .pipe(z
                .coerce
                .number()
                .min(0, $_('fees.add.flatRange', { locale: $lang }))
                .max(10000, $_('fees.add.flatRange', { locale: $lang }))
                .finite($_('fees.add.finite', { locale: $lang }))
                .refine(twoDecimals, $_('fees.add.precision', { locale: $lang }))),
        // optional: empty = no cap; otherwise > 0, ≤ 100,000, max 2 decimals
        cap: z
            .string()
            .trim()
            .refine(x => {
                if (x === "") return true;
                const n = Number(x);
                return Number.isFinite(n) && n > 0 && n <= 100000 && twoDecimals(n);
            }, $_('fees.add.capRange', { locale: $lang })),
        // optional: empty = immediate; otherwise must be a valid future instant
        effectiveAt: z
            .string()
            .refine(x => x === "" || !Number.isNaN(new Date(x).getTime()),
                $_('fees.add.effectiveInvalid', { locale: $lang }))
            .refine(x => x === "" || new Date(x).getTime() > Date.now(),
                $_('fees.add.effectivePast', { locale: $lang })),
    }).required();

    const onAddChange = (path: string) => async () => {
        await tick();
        addTaints[path] = true;
        const r = setFeeSchema.safeParse(addVal);
        if (!r.success) {
            const e = r as SafeParseError<{ percentage: number }>;
            addErrors = e.error.errors;
        } else {
            addErrors = [];
        }
    }

    function openAddDialog(t: FeeType) {
        addTarget = t;
        // seed with the current fee of this type (floating-point noise trimmed
        // to the 2 decimals the editor accepts)
        const f = fees[t];
        addVal.percentage = f != null ? String(Number(f.percentage.toFixed(2))) : "";
        addVal.flatAmount = f != null ? String(Number(f.flatAmount.toFixed(2))) : "";
        addVal.cap = f?.cap != null ? String(Number(f.cap.toFixed(2))) : "";
        addVal.effectiveAt = "";
        addEffectiveMin = nowLocalMinute();
        addErrors = [];
        addTaints = {};
        addDialogOpen = true;
    }

    async function submitAdd() {
        await onAddChange("percentage")();
        await onAddChange("flatAmount")();
        await onAddChange("cap")();
        await onAddChange("effectiveAt")();
        if (addErrors.length !== 0) return;

        const v = setFeeSchema.parse(addVal);
        // datetime-local is timezone-less; Date() reads it in the admin's
        // local zone and toISOString() converts to the UTC instant zinc expects
        const effectiveAtIso = v.effectiveAt !== "" ? new Date(v.effectiveAt).toISOString() : null;
        // decided from what we sent, not the response, so server clock skew
        // can never make an immediate change look scheduled (or vice versa)
        const scheduled = effectiveAtIso != null && new Date(effectiveAtIso).getTime() > Date.now();
        addSubmitting = true;
        await toResult(() => $api.vFeeCreate(addTarget, "1.0", {
            percentage: v.percentage,
            flatAmount: v.flatAmount,
            effectiveAt: effectiveAtIso,
            cap: v.cap === "" ? null : Number(v.cap),
        }), $_('fees.add.updateError', { locale: $lang })).match({
            ok: (f) => {
                const desc = describeFee(f, $_, $lang);
                if (scheduled) {
                    // future change: the current fee is untouched until it kicks in
                    toast.info($_('fees.add.scheduledSuccess', {
                        locale: $lang,
                        values: { desc, date: formatDateTime(f.effectiveAt, $lang) },
                    }));
                } else {
                    toast.info($_('fees.add.success', { locale: $lang, values: { desc } }));
                }
                reload(addTarget);
                addDialogOpen = false;
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        addSubmitting = false;
    }

    // ---- fee announcement email (admin): type + optional queued event +
    // optional custom reasoning; single-user test send and an all-users
    // broadcast behind a destructive confirm dialog. zinc enforces admin. ----
    let announceType: Selected<string> = {value: "Withdrawal", label: ""};
    // undefined / "" = default: the next upcoming event, or the live fee if
    // the queue is empty (zinc's behaviour when changeId is omitted)
    let announceEvent: Selected<string> | undefined = undefined;
    let announceReasoning = "";
    let announceUserId = "";
    let announceSending = false;
    let broadcastDialogOpen = false;
    let broadcasting = false;

    // keep the closed-trigger labels localized after a language switch
    $: if (announceType?.value) {
        const translated = $_(`fees.types.${announceType.value}`, { locale: $lang });
        if (announceType.label !== translated) announceType = { ...announceType, label: translated };
    }

    $: announceQueue = queues[(announceType?.value ?? "Withdrawal") as FeeType];

    function announceTypeChange(s: Selected<string> | undefined) {
        if (s == null) return;
        announceType = s;
        // the queued events belong to the previous type; back to the default
        announceEvent = undefined;
    }

    function eventLabel(c: FeeChangeRes, l: typeof $lang): string {
        return $_('fees.queue.line', {
            locale: l,
            values: { desc: describeFee(c, $_, l), date: formatDateTime(c.effectiveAt, l) },
        });
    }

    function announceBody(): AnnounceFeeReq {
        const changeId = announceEvent?.value ? announceEvent.value : undefined;
        const reasoning = announceReasoning.trim() === "" ? undefined : announceReasoning.trim();
        return { type: announceType?.value ?? "Withdrawal", changeId, reasoning };
    }

    async function sendAnnouncementTest() {
        announceSending = true;
        await toResult(() => $api.vAnnouncementFeeCreate2(announceUserId.trim(), "1.0", announceBody()),
            $_('fees.announcement.sendError', { locale: $lang })).match({
            ok: (r) => {
                toast.info($_('fees.announcement.sendSuccess', {
                    locale: $lang,
                    values: { email: r.email ?? r.userId },
                }));
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        announceSending = false;
    }

    async function broadcastAnnouncement() {
        broadcasting = true;
        await toResult(() => $api.vAnnouncementFeeCreate("1.0", announceBody()),
            $_('fees.announcement.broadcastError', { locale: $lang })).match({
            ok: (r) => {
                toast.info($_('fees.announcement.broadcastSuccess', {
                    locale: $lang,
                    values: { sent: r.sent, failed: r.failed },
                }));
                broadcastDialogOpen = false;
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        broadcasting = false;
    }
</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        {#each FEE_TYPES as t (t)}
            {@const f = fees[t]}
            <Card.Root>
                <Card.Content class="pt-6">
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-wrap gap-4 justify-between items-start">
                            <div class="flex flex-col gap-1">
                                <Card.Title>{$_(`fees.section.${t}.title`, { locale: $lang })}</Card.Title>
                                <Card.Description>{$_(`fees.section.${t}.description`, { locale: $lang })}</Card.Description>
                                {#if t === "Termination"}
                                    <div class="text-sm text-muted-foreground">{$_('fees.section.terminationNote', { locale: $lang })}</div>
                                {/if}
                                <div class="text-sm text-muted-foreground">{$_('fees.section.hint', { locale: $lang })}</div>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="flex flex-col items-end gap-1">
                                    {#if f != null}
                                        <div class="text-2xl font-semibold">{describeFee(f, $_, $lang)}</div>
                                        <div class="text-sm text-muted-foreground">{$_('fees.section.currentLabel', { locale: $lang })}</div>
                                    {:else if feeLoadFailed[t]}
                                        <Button variant="outline" size="sm" on:click={() => loadCurrent(t)}>
                                            {$_('actions.retry', { locale: $lang })}
                                        </Button>
                                    {:else}
                                        <LucideLoader class="h-4 w-4 animate-spin"/>
                                    {/if}
                                </div>
                                <Button variant="outline" on:click={() => openAddDialog(t)}>
                                    <LucidePlus class="mr-2 h-4 w-4"/>
                                    {$_('fees.add.trigger', { locale: $lang })}
                                </Button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <div class="text-sm font-medium">{$_('fees.queue.title', { locale: $lang })}</div>
                            {#if queueLoadFailed[t]}
                                <div class="flex items-center gap-2">
                                    <div class="text-sm text-destructive">{$_('fees.queue.loadFailed', { locale: $lang })}</div>
                                    <Button variant="outline" size="sm" on:click={() => loadQueue(t)}>
                                        {$_('actions.retry', { locale: $lang })}
                                    </Button>
                                </div>
                            {:else if queues[t].length === 0}
                                <div class="text-sm text-muted-foreground">{$_('fees.queue.empty', { locale: $lang })}</div>
                            {:else}
                                {#each queues[t] as c (c.id)}
                                    <div class="flex items-center gap-3 rounded-lg border p-3">
                                        <Checkbox bind:checked={selected[t][c.id]}
                                                  aria-label={$_('fees.queue.selectAria', { locale: $lang })}/>
                                        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                            <span class="font-medium">{describeFee(c, $_, $lang)}</span>
                                            <span class="text-sm text-muted-foreground">{$_('fees.queue.from', { locale: $lang, values: { date: formatDateTime(c.effectiveAt, $lang) } })}</span>
                                        </div>
                                    </div>
                                {/each}
                                <Button variant="destructive" size="sm" class="self-start"
                                        disabled={selectedCounts[t] === 0 || cancelling}
                                        on:click={() => openCancelDialog(t)}>
                                    {$_('fees.queue.cancelSelected', { locale: $lang })}
                                </Button>
                            {/if}
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>
        {/each}
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <Card.Title>{$_('fees.withdrawalSettings.title', { locale: $lang })}</Card.Title>
                        <Card.Description>{$_('fees.withdrawalSettings.description', { locale: $lang })}</Card.Description>
                    </div>
                    {#if wSettingsFailed}
                        <div class="flex items-center gap-2">
                            <div class="text-sm text-destructive">{$_('fees.withdrawalSettings.loadFailed', { locale: $lang })}</div>
                            <Button variant="outline" size="sm" on:click={loadWithdrawalSettings}>
                                {$_('actions.retry', { locale: $lang })}
                            </Button>
                        </div>
                    {:else if wSettings == null}
                        <LucideLoader class="h-4 w-4 animate-spin"/>
                    {:else}
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex flex-col gap-1">
                                <label class="text-sm font-medium" for="w-card-refund">
                                    {$_('fees.withdrawalSettings.cardRefundLabel', { locale: $lang })}
                                </label>
                                <div class="text-sm text-muted-foreground">{$_('fees.withdrawalSettings.cardRefundHint', { locale: $lang })}</div>
                            </div>
                            <Switch id="w-card-refund" bind:checked={wCardRefundEnabled}/>
                        </div>
                        <div class="flex flex-col gap-2">
                            <div class="text-sm font-medium">{$_('fees.withdrawalSettings.payNowLabel', { locale: $lang })}</div>
                            <Select.Root selected={wPayNowMode} onSelectedChange={(s) => { if (s != null) wPayNowMode = s; }}>
                                <Select.Trigger class="lg:max-w-96">
                                    <Select.Value placeholder={$_('fees.withdrawalSettings.payNowLabel', { locale: $lang })}/>
                                </Select.Trigger>
                                <Select.Content>
                                    {#each PAYNOW_MODES as m (m)}
                                        <Select.Item value={m} label={$_(`fees.withdrawalSettings.modes.${m}.label`, { locale: $lang })}>
                                            <div class="flex flex-col gap-0.5">
                                                <span>{$_(`fees.withdrawalSettings.modes.${m}.label`, { locale: $lang })}</span>
                                                <span class="text-xs text-muted-foreground">{$_(`fees.withdrawalSettings.modes.${m}.hint`, { locale: $lang })}</span>
                                            </div>
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                            <div class="text-sm text-muted-foreground">
                                {$_(`fees.withdrawalSettings.modes.${(wPayNowMode?.value ?? "FallbackOnly")}.hint`, { locale: $lang })}
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex flex-col gap-1">
                                <label class="text-sm font-medium" for="w-sweep">
                                    {$_('fees.withdrawalSettings.sweepLabel', { locale: $lang })}
                                </label>
                                <div class="text-sm text-muted-foreground">{$_('fees.withdrawalSettings.sweepHint', { locale: $lang })}</div>
                            </div>
                            <Switch id="w-sweep" bind:checked={wSweepEnabled}/>
                        </div>
                        <Button class="self-start" on:click={saveWithdrawalSettings} disabled={wSaving}>
                            {#if wSaving}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                            {/if}
                            {$_('fees.withdrawalSettings.save', { locale: $lang })}
                        </Button>
                    {/if}
                </div>
            </Card.Content>
        </Card.Root>
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <Card.Title>{$_('fees.announcement.title', { locale: $lang })}</Card.Title>
                        <Card.Description>{$_('fees.announcement.description', { locale: $lang })}</Card.Description>
                    </div>
                    <div class="flex flex-wrap gap-4">
                        <div class="flex w-full flex-col gap-2 lg:max-w-60">
                            <div class="text-sm font-medium">{$_('fees.announcement.typeLabel', { locale: $lang })}</div>
                            <Select.Root selected={announceType} onSelectedChange={announceTypeChange}>
                                <Select.Trigger>
                                    <Select.Value placeholder={$_('fees.announcement.typeLabel', { locale: $lang })}/>
                                </Select.Trigger>
                                <Select.Content>
                                    {#each FEE_TYPES as t (t)}
                                        <Select.Item value={t} label={$_(`fees.types.${t}`, { locale: $lang })}>
                                            {$_(`fees.types.${t}`, { locale: $lang })}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <div class="flex w-full flex-col gap-2 lg:max-w-96">
                            <div class="text-sm font-medium">{$_('fees.announcement.eventLabel', { locale: $lang })}</div>
                            <Select.Root bind:selected={announceEvent}>
                                <Select.Trigger>
                                    <Select.Value placeholder={$_('fees.announcement.eventDefault', { locale: $lang })}/>
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="" label={$_('fees.announcement.eventDefault', { locale: $lang })}>
                                        {$_('fees.announcement.eventDefault', { locale: $lang })}
                                    </Select.Item>
                                    {#each announceQueue as c (c.id)}
                                        <Select.Item value={c.id} label={eventLabel(c, $lang)}>
                                            {eventLabel(c, $lang)}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <div class="text-sm font-medium">{$_('fees.announcement.reasoningLabel', { locale: $lang })}</div>
                        <Textarea bind:value={announceReasoning}
                                  placeholder={$_('fees.announcement.reasoningPlaceholder', { locale: $lang })}/>
                        <div class="text-sm text-muted-foreground">{$_('fees.announcement.reasoningHint', { locale: $lang })}</div>
                    </div>
                    <div class="flex flex-wrap gap-4 items-center">
                        <Input
                                class="w-full lg:max-w-80"
                                placeholder={$_('fees.announcement.userIdPlaceholder', { locale: $lang })}
                                bind:value={announceUserId}
                        />
                        <Button variant="outline" disabled={announceSending || announceUserId.trim() === ""}
                                on:click={sendAnnouncementTest}>
                            {#if announceSending}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                            {:else}
                                <LucideMail class="mr-2 h-4 w-4"/>
                            {/if}
                            {$_('fees.announcement.sendTest', { locale: $lang })}
                        </Button>
                        <Dialog.Root bind:open={broadcastDialogOpen}>
                            <Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}>
                                {$_('fees.announcement.broadcast', { locale: $lang })}
                            </Dialog.Trigger>
                            <Dialog.Content>
                                <Dialog.Header>
                                    <Dialog.Title>{$_('fees.announcement.broadcastTitle', { locale: $lang })}</Dialog.Title>
                                    <Dialog.Description>
                                        <div class="flex flex-col gap-4">
                                            <Alert.Root class="mt-4">
                                                <AlertTriangle class="h-4 w-4"/>
                                                <Alert.Title>{$_('fees.announcement.broadcastWarningTitle', { locale: $lang })}</Alert.Title>
                                                <Alert.Description>
                                                    {$_('fees.announcement.broadcastWarning', { locale: $lang })}
                                                </Alert.Description>
                                            </Alert.Root>
                                            <Button variant="destructive" class="my-2" on:click={broadcastAnnouncement}
                                                    disabled={broadcasting}>
                                                {#if broadcasting}
                                                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                                {/if}
                                                {$_('fees.announcement.broadcastConfirm', { locale: $lang })}
                                            </Button>
                                        </div>
                                    </Dialog.Description>
                                </Dialog.Header>
                            </Dialog.Content>
                        </Dialog.Root>
                    </div>
                </div>
            </Card.Content>
        </Card.Root>
    </div>
</div>

<Dialog.Root bind:open={addDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('fees.add.title', { locale: $lang, values: { type: $_(`fees.types.${addTarget}`, { locale: $lang }) } })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('fees.add.intro', { locale: $lang })}
                    </p>
                    <p class="text-justify">
                        {$_('fees.add.zeroHint', { locale: $lang })}
                    </p>
                    <Validation errors={addErrors} taints={addTaints} path="percentage">
                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-medium" for="fee-percentage">
                                {$_('fees.add.percentageLabel', { locale: $lang })}
                            </label>
                            <div class="flex items-center gap-2">
                                <Input
                                        id="fee-percentage"
                                        class="flex-1"
                                        placeholder={$_('fees.add.percentagePlaceholder', { locale: $lang })}
                                        inputmode="decimal"
                                        bind:value={addVal.percentage}
                                        on:input={onAddChange("percentage")}
                                />
                                <div class="text-lg text-primary">%</div>
                            </div>
                        </div>
                    </Validation>
                    <Validation errors={addErrors} taints={addTaints} path="flatAmount">
                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-medium" for="fee-flat-amount">
                                {$_('fees.add.flatLabel', { locale: $lang })}
                            </label>
                            <div class="flex items-center gap-2">
                                <div class="text-lg text-primary">S$</div>
                                <Input
                                        id="fee-flat-amount"
                                        class="flex-1"
                                        placeholder={$_('fees.add.flatPlaceholder', { locale: $lang })}
                                        inputmode="decimal"
                                        bind:value={addVal.flatAmount}
                                        on:input={onAddChange("flatAmount")}
                                />
                            </div>
                        </div>
                    </Validation>
                    <Validation errors={addErrors} taints={addTaints} path="cap">
                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-medium" for="fee-cap">
                                {$_('fees.add.capLabel', { locale: $lang })}
                            </label>
                            <div class="flex items-center gap-2">
                                <div class="text-lg text-primary">S$</div>
                                <Input
                                        id="fee-cap"
                                        class="flex-1"
                                        placeholder={$_('fees.add.capPlaceholder', { locale: $lang })}
                                        inputmode="decimal"
                                        bind:value={addVal.cap}
                                        on:input={onAddChange("cap")}
                                />
                            </div>
                            <div class="text-sm text-muted-foreground">
                                {$_('fees.add.capHint', { locale: $lang })}
                            </div>
                        </div>
                    </Validation>
                    <Validation errors={addErrors} taints={addTaints} path="effectiveAt">
                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-medium" for="fee-effective-at">
                                {$_('fees.add.effectiveFrom', { locale: $lang })}
                            </label>
                            <Input
                                    id="fee-effective-at"
                                    type="datetime-local"
                                    min={addEffectiveMin}
                                    bind:value={addVal.effectiveAt}
                                    on:input={onAddChange("effectiveAt")}
                            />
                            <div class="text-sm text-muted-foreground">
                                {$_('fees.add.effectiveHint', { locale: $lang })}
                            </div>
                        </div>
                    </Validation>
                    <Button class="my-2" on:click={submitAdd} disabled={addSubmitting}>
                        {#if addSubmitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('fees.add.save', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={cancelDialogOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('fees.queue.cancelTitle', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <Alert.Root class="mt-4">
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('fees.queue.cancelWarningTitle', { locale: $lang })}</Alert.Title>
                        <Alert.Description>
                            {$_('fees.queue.cancelWarning', { locale: $lang, values: { count: selectedCounts[cancelTarget] } })}
                        </Alert.Description>
                    </Alert.Root>
                    <Button variant="destructive" class="my-2" on:click={cancelSelected} disabled={cancelling}>
                        {#if cancelling}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('fees.queue.cancelConfirm', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
