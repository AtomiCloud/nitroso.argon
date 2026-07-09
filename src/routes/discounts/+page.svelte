<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {DiscountPrincipalRes, DiscountRecordRes, FeeChangeRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {api, problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";
    import {page} from "$app/stores";
    import {goto, invalidateAll} from "$app/navigation";

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
    import {AlertTriangle, FilePieChart, LucideEdit, LucideLoader, LucideMail, LucideTicket, Puzzle} from "lucide-svelte";
    import {Button, buttonVariants} from "$lib/components/ui/button";
    import Validation from "$lib/components/core/Validation.svelte";
    import {loadWithdrawFeeRate} from "$lib/api/fee";
    import type {PageData} from "./$types";
    import {DISCOUNT_MATCH_MODE, DISCOUNT_STATUS, DISCOUNT_TYPE} from "./status";
    import {Input} from "$lib/components/ui/input";
    import {Badge} from "$lib/components/ui/badge";
    import CreateDiscounts from "$lib/components/entities/Discounts/CreateDiscounts.svelte";
    import {Switch} from "$lib/components/ui/switch";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import UpdateDiscounts from "$lib/components/entities/Discounts/UpdateDiscounts.svelte";
    import DeleteDiscounts from "$lib/components/entities/Discounts/DeleteDiscounts.svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber, formatDateTime} from "$lib/i18n";

    export let data: PageData;

    $: discounts = (Res.fromSerial<DiscountPrincipalRes[], ProblemDetails>(data.result)
        .match({
            ok: (a: DiscountPrincipalRes[]): DiscountPrincipalRes[] => {
                problem.set(null)
                return a.reverse();
            },
            err: (e) => {
                console.error(e);
                problem.set(e);
                return null as never;
            }
        }) as Promise<DiscountPrincipalRes[]>);


    let search = $page.url.searchParams.get("search") ?? "";
    let discountType = $page.url.searchParams.get("discountType") ?? "";
    let matchMode = $page.url.searchParams.get("matchMode") ?? "";
    let disabled = $page.url.searchParams.get("disabled") ?? "";

    let discountTypeSelect: Selected<string> | undefined = DISCOUNT_TYPE[discountType];
    let matchModeSelect: Selected<string> | undefined = DISCOUNT_MATCH_MODE[matchMode];
    let disabledSelect: Selected<string> | undefined = DISCOUNT_STATUS[disabled];

    // Keep the closed-trigger labels localized for deep-linked / language-switched
    // state; the menu items are already translated but `Selected.label` defaults
    // to the English constant.
    $: if (discountTypeSelect?.value) {
        const translated = $_(`status.discountType.${discountTypeSelect.value}`, { locale: $lang });
        if (discountTypeSelect.label !== translated) discountTypeSelect = { ...discountTypeSelect, label: translated };
    }
    $: if (matchModeSelect?.value) {
        const translated = $_(`status.discountMode.${matchModeSelect.value}`, { locale: $lang });
        if (matchModeSelect.label !== translated) matchModeSelect = { ...matchModeSelect, label: translated };
    }
    $: if (disabledSelect?.value) {
        const translated = $_(`status.discountEnabled.${disabledSelect.value}`, { locale: $lang });
        if (disabledSelect.label !== translated) disabledSelect = { ...disabledSelect, label: translated };
    }

    function discountTypeChange(s: Selected<string> | undefined) {
        discountTypeSelect = s;
        triggerSearch();
    }

    function matchModeChange(s: Selected<string> | undefined) {
        matchModeSelect = s;
        triggerSearch();
    }

    function disableChange(s: Selected<string> | undefined) {
        disabledSelect = s;
        triggerSearch();
    }


    function triggerSearch() {
        const mm = matchModeSelect?.value ?? ""
        const dt = discountTypeSelect?.value ?? ""
        const ds = disabledSelect?.value ?? ""
        goto(`?discountType=${dt}&matchMode=${mm}&disabled=${ds}&search=${search}`,
            {
                keepFocus: true,
                noScroll: true,
            });
    }

    function displayDiscount(record: DiscountRecordRes): string {
        if (record.type === "Percentage") {
            return `${formatNumber(record.amount * 100, $lang, {maximumFractionDigits: 1})}%`
        }
        return formatMoney(record.amount, $lang)
    }

    // Withdrawal fee editor (admin-only, same server-side gating as the rest
    // of this page — zinc rejects non-admin writes). The shared helper returns
    // the RATE (e.g. 0.04 = 4%); the editor works in percentage (0-100).
    // 0% disables the fee and hides all fee UI from users.
    let feeRate: number | null = null;
    let feeLoadFailed = false;

    // scheduled future fee changes (soonest first, from GET fee/upcoming);
    // rendered below the current rate, nothing shown when empty
    let upcomingChanges: FeeChangeRes[] = [];

    onMount(() => {
        loadFeeRate();
        loadUpcoming();
    })

    async function loadFeeRate() {
        feeLoadFailed = false;
        feeRate = await loadWithdrawFeeRate($api, $_('discounts.fee.loadFailed', { locale: $lang }));
        feeLoadFailed = feeRate == null;
    }

    async function loadUpcoming() {
        await toResult(() => $api.vWithdrawalFeeUpcomingList("1.0"),
            $_('discounts.fee.upcomingLoadFailed', { locale: $lang })).match({
            ok: (u) => {
                upcomingChanges = u;
            },
            err: (e) => {
                // non-fatal: the list simply stays hidden
                console.error(e);
            }
        })
    }

    $: feeRatePercent = feeRate != null ? formatNumber(feeRate * 100, $lang, {maximumFractionDigits: 2}) : null;

    // fee edit dialog state — mirrors the page's usual zod + Validation pattern
    let feeDialogOpen = false;
    let feeSubmitting = false;
    let feeErrors: ZodIssue[] = [];
    let feeTaints: Record<string, boolean> = {}

    const feeVal = {
        percentage: "",
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

    let feeEffectiveMin = nowLocalMinute();

    // requires a non-empty input before coercing: z.coerce.number() turns ""
    // into 0, and 0 is a meaningful (fee-disabling) value here, so an
    // accidentally cleared field must not silently disable the fee
    $: setFeeSchema = z.object({
        percentage: z
            .string()
            .trim()
            .min(1, $_('discounts.fee.range', { locale: $lang }))
            .pipe(z
                .coerce
                .number()
                .min(0, $_('discounts.fee.range', { locale: $lang }))
                .max(100, $_('discounts.fee.range', { locale: $lang }))
                .finite($_('discounts.fee.finite', { locale: $lang }))
                .refine(x => {
                    const r = x.toString().split(".")
                    if (r.length == 2) return r[1].length <= 2
                    return true;
                }, $_('discounts.fee.precision', { locale: $lang }))),
        // optional: empty = immediate; otherwise must be a valid future instant
        effectiveAt: z
            .string()
            .refine(x => x === "" || !Number.isNaN(new Date(x).getTime()),
                $_('discounts.fee.effectiveInvalid', { locale: $lang }))
            .refine(x => x === "" || new Date(x).getTime() > Date.now(),
                $_('discounts.fee.effectivePast', { locale: $lang })),
    }).required();

    const onFeeChange = (path: string) => async () => {
        await tick();
        feeTaints[path] = true;
        const r = setFeeSchema.safeParse(feeVal);
        if (!r.success) {
            const e = r as SafeParseError<{ percentage: number }>;
            feeErrors = e.error.errors;
        } else {
            feeErrors = [];
        }
    }

    function openFeeDialog() {
        // seed with the current percentage (rate * 100, floating-point noise
        // trimmed to the 2 decimals the editor accepts)
        feeVal.percentage = feeRate != null ? String(Number((feeRate * 100).toFixed(2))) : "";
        feeVal.effectiveAt = "";
        feeEffectiveMin = nowLocalMinute();
        feeErrors = [];
        feeTaints = {};
        feeDialogOpen = true;
    }

    async function submitFee() {
        await onFeeChange("percentage")();
        await onFeeChange("effectiveAt")();
        if (feeErrors.length !== 0) return;

        const v = setFeeSchema.parse(feeVal);
        // datetime-local is timezone-less; Date() reads it in the admin's
        // local zone and toISOString() converts to the UTC instant zinc expects
        const effectiveAtIso = v.effectiveAt !== "" ? new Date(v.effectiveAt).toISOString() : null;
        // decided from what we sent, not the response, so server clock skew
        // can never make an immediate change look scheduled (or vice versa)
        const scheduled = effectiveAtIso != null && new Date(effectiveAtIso).getTime() > Date.now();
        feeSubmitting = true;
        await toResult(() => $api.vWithdrawalFeeCreate("1.0", {
            withdrawFeePercentage: v.percentage,
            effectiveAt: effectiveAtIso,
        }), $_('discounts.fee.updateError', { locale: $lang })).match({
            ok: (f) => {
                const rate = formatNumber(f.withdrawFeePercentage, $lang, {maximumFractionDigits: 2});
                if (scheduled) {
                    // future change: the current rate is untouched until it kicks in
                    toast.info($_('discounts.fee.scheduledSuccess', {
                        locale: $lang,
                        values: { rate, date: formatDateTime(f.effectiveAt, $lang) },
                    }));
                } else {
                    feeRate = f.withdrawFeePercentage / 100;
                    feeLoadFailed = false;
                    toast.info($_('discounts.fee.success', { locale: $lang, values: { rate } }));
                }
                loadUpcoming();
                feeDialogOpen = false;
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        feeSubmitting = false;
    }

    // Withdrawal-fee announcement email (admin): single-user test send and
    // an all-users broadcast behind a destructive confirm dialog. Both are
    // fire-per-click POSTs; zinc enforces admin server-side.
    let announceUserId = "";
    let announceSending = false;
    let broadcastDialogOpen = false;
    let broadcasting = false;

    async function sendAnnouncementTest() {
        announceSending = true;
        await toResult(() => $api.vAnnouncementWithdrawalFeeCreate2(announceUserId.trim(), "1.0"),
            $_('discounts.announcement.sendError', { locale: $lang })).match({
            ok: (r) => {
                toast.info($_('discounts.announcement.sendSuccess', {
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
        await toResult(() => $api.vAnnouncementWithdrawalFeeCreate("1.0"),
            $_('discounts.announcement.broadcastError', { locale: $lang })).match({
            ok: (r) => {
                toast.info($_('discounts.announcement.broadcastSuccess', {
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

    const loadingTracker: Record<string, boolean> = {}

    const onChange = (current: DiscountPrincipalRes) => async (e: boolean) => {

        loadingTracker[current!.id] = true;

        await toResult(() => $api.vDiscountUpdate(current.id, "1.0", {
            record: {
                ...current.record
            },
            target: {
                ...current.target
            },
            status: {
                ...current.status,
                disabled: !e
            }
        }), $_('discounts.list.updateError', { locale: $lang })).match({
            ok: ok => {
                toast.info(ok.status.disabled
                    ? $_('discounts.list.disabledToast', { locale: $lang })
                    : $_('discounts.list.enabledToast', { locale: $lang }));
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        loadingTracker[current.id] = false;
    }

</script>

<div class="flex flex-col">
    <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex flex-wrap gap-4 justify-between items-center">
                    <div class="flex flex-col gap-1">
                        <Card.Title>{$_('discounts.fee.title', { locale: $lang })}</Card.Title>
                        <Card.Description>{$_('discounts.fee.description', { locale: $lang })}</Card.Description>
                        <div class="text-sm text-muted-foreground">{$_('discounts.fee.hint', { locale: $lang })}</div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="flex flex-col items-end gap-1">
                            {#if feeRatePercent != null}
                                <div class="text-2xl font-semibold">{feeRatePercent}%</div>
                            {:else if feeLoadFailed}
                                <Button variant="outline" size="sm" on:click={loadFeeRate}>
                                    {$_('actions.retry', { locale: $lang })}
                                </Button>
                            {:else}
                                <LucideLoader class="h-4 w-4 animate-spin"/>
                            {/if}
                            {#if upcomingChanges.length > 0}
                                <div class="flex flex-col items-end gap-0.5 text-sm text-muted-foreground">
                                    {#each upcomingChanges as c}
                                        <div>{$_('discounts.fee.upcomingLine', { locale: $lang, values: { rate: formatNumber(c.withdrawFeePercentage, $lang, {maximumFractionDigits: 2}), date: formatDateTime(c.effectiveAt, $lang) } })}</div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        <Dialog.Root bind:open={feeDialogOpen}>
                            <Button variant="outline" on:click={openFeeDialog}>
                                <LucideEdit class="mr-2 h-4 w-4"/>
                                {$_('discounts.fee.edit', { locale: $lang })}
                            </Button>
                            <Dialog.Content>
                                <Dialog.Header>
                                    <Dialog.Title>{$_('discounts.fee.dialogTitle', { locale: $lang })}</Dialog.Title>
                                    <Dialog.Description>
                                        <div class="flex flex-col gap-4">
                                            <p class="text-justify py-2">
                                                {$_('discounts.fee.dialogIntro', { locale: $lang })}
                                            </p>
                                            <p class="text-justify">
                                                {$_('discounts.fee.hint', { locale: $lang })}
                                            </p>
                                            <Validation errors={feeErrors} taints={feeTaints} path="percentage">
                                                <div class="flex items-center gap-2">
                                                    <Input
                                                            class="flex-1"
                                                            placeholder={$_('discounts.fee.placeholder', { locale: $lang })}
                                                            inputmode="decimal"
                                                            bind:value={feeVal.percentage}
                                                            on:input={onFeeChange("percentage")}
                                                    />
                                                    <div class="text-lg text-primary">%</div>
                                                </div>
                                            </Validation>
                                            <Validation errors={feeErrors} taints={feeTaints} path="effectiveAt">
                                                <div class="flex flex-col gap-2">
                                                    <label class="text-sm font-medium" for="fee-effective-at">
                                                        {$_('discounts.fee.effectiveFrom', { locale: $lang })}
                                                    </label>
                                                    <Input
                                                            id="fee-effective-at"
                                                            type="datetime-local"
                                                            min={feeEffectiveMin}
                                                            bind:value={feeVal.effectiveAt}
                                                            on:input={onFeeChange("effectiveAt")}
                                                    />
                                                    <div class="text-sm text-muted-foreground">
                                                        {$_('discounts.fee.effectiveHint', { locale: $lang })}
                                                    </div>
                                                </div>
                                            </Validation>
                                            <Button class="my-2" on:click={submitFee} disabled={feeSubmitting}>
                                                {#if feeSubmitting}
                                                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                                {/if}
                                                {$_('discounts.fee.save', { locale: $lang })}
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
        <Card.Root>
            <Card.Content class="pt-6">
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <Card.Title>{$_('discounts.announcement.title', { locale: $lang })}</Card.Title>
                        <Card.Description>{$_('discounts.announcement.description', { locale: $lang })}</Card.Description>
                    </div>
                    <div class="flex flex-wrap gap-4 items-center">
                        <Input
                                class="w-full lg:max-w-80"
                                placeholder={$_('discounts.announcement.userIdPlaceholder', { locale: $lang })}
                                bind:value={announceUserId}
                        />
                        <Button variant="outline" disabled={announceSending || announceUserId.trim() === ""}
                                on:click={sendAnnouncementTest}>
                            {#if announceSending}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                            {:else}
                                <LucideMail class="mr-2 h-4 w-4"/>
                            {/if}
                            {$_('discounts.announcement.sendTest', { locale: $lang })}
                        </Button>
                        <Dialog.Root bind:open={broadcastDialogOpen}>
                            <Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}>
                                {$_('discounts.announcement.broadcast', { locale: $lang })}
                            </Dialog.Trigger>
                            <Dialog.Content>
                                <Dialog.Header>
                                    <Dialog.Title>{$_('discounts.announcement.broadcastTitle', { locale: $lang })}</Dialog.Title>
                                    <Dialog.Description>
                                        <div class="flex flex-col gap-4">
                                            <Alert.Root class="mt-4">
                                                <AlertTriangle class="h-4 w-4"/>
                                                <Alert.Title>{$_('discounts.announcement.broadcastWarningTitle', { locale: $lang })}</Alert.Title>
                                                <Alert.Description>
                                                    {$_('discounts.announcement.broadcastWarning', { locale: $lang })}
                                                </Alert.Description>
                                            </Alert.Root>
                                            <Button variant="destructive" class="my-2" on:click={broadcastAnnouncement}
                                                    disabled={broadcasting}>
                                                {#if broadcasting}
                                                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                                                {/if}
                                                {$_('discounts.announcement.broadcastConfirm', { locale: $lang })}
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
        <div class="flex flex-wrap gap-4 w-full">
            <Input placeholder={$_('actions.search', { locale: $lang })} bind:value={search} on:input={triggerSearch}/>
            <Select.Root bind:selected={disabledSelect} onSelectedChange={disableChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <FilePieChart class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('fields.status', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('discounts.list.none', { locale: $lang })}</Select.Item>
                    {#each Object.entries(DISCOUNT_STATUS) as [, val]}
                        <Select.Item value={val.value}>{$_(`status.discountEnabled.${val.value}`, { locale: $lang })}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <Select.Root bind:selected={discountTypeSelect} onSelectedChange={discountTypeChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <LucideTicket  class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('discounts.list.discountType', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('discounts.list.none', { locale: $lang })}</Select.Item>
                    {#each Object.entries(DISCOUNT_TYPE) as [, val]}
                        <Select.Item value={val.value}>{$_(`status.discountType.${val.value}`, { locale: $lang })}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>

            <Select.Root bind:selected={matchModeSelect} onSelectedChange={matchModeChange}>
                <Select.Trigger class="w-full lg:max-w-60">
                    <Puzzle class="mr-2 h-4 w-4"/>
                    <Select.Value placeholder={$_('discounts.list.matchMode', { locale: $lang })}/>
                </Select.Trigger>
                <Select.Content>
                    <Select.Item value="">{$_('discounts.list.none', { locale: $lang })}</Select.Item>
                    {#each Object.entries(DISCOUNT_MATCH_MODE) as [, val]}
                        <Select.Item value={val.value}>{$_(`status.discountMode.${val.value}`, { locale: $lang })}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <CreateDiscounts/>
        </div>
        {#await discounts}
            <Loader/>
        {:then ds}
            <Page notFoundMessage={$_('discounts.list.notFound', { locale: $lang })} empty={ds.length === 0}>
                <div class="flex flex-col gap-4 my-4">
                    {#each ds as d}
                        <Card.Root>
                            <Card.Header class="bg-muted">
                                <div class="flex justify-between">
                                    <div>
                                        <Card.Title>{d.record.name}</Card.Title>
                                        <Card.Description>{d.record.description}</Card.Description>
                                    </div>
                                    <div class="flex items-center">
                                        <Badge>{d.record?.type ? $_(`status.discountType.${d.record.type}`, { locale: $lang }) : ''}</Badge>
                                    </div>
                                </div>
                            </Card.Header>
                            <Card.Content>
                                <div class="flex gap-8 justify-between mt-4">
                                    <div>
                                        <div class="text-lg my-4">
                                            {$_('discounts.list.providesDiscount', { locale: $lang, values: { amount: displayDiscount(d.record) } })}
                                        </div>

                                        <div class="flex gap-4 items-center flex-wrap">
                                            {#each d.target.matches as m, i }
                                                <div class="flex gap-2 my-2 items-center border p-2 rounded-lg">
                                                    {m.matchType ? $_(`status.discountMatchType.${m.matchType}`, { locale: $lang }) : ''}
                                                    <Badge>{m.value}</Badge>
                                                </div>
                                                <div>
                                                    {#if i !== d.target.matches.length - 1}
                                                        {d.target.matchMode === "All" ? $_('discounts.list.and', { locale: $lang }) : $_('discounts.list.or', { locale: $lang })}
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                    <div class="flex flex-col justify-center gap-4">
                                        <div class="flex justify-center flex-col items-center">
                                            <Switch disabled={loadingTracker[d.id]} checked={!d.status.disabled}
                                                    onCheckedChange={onChange(d)}/>
                                        </div>
                                        <div>
                                            <UpdateDiscounts discount={d}/>
                                            <DeleteDiscounts discount={d}/>
                                        </div>
                                    </div>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    {/each}
                </div>
            </Page>
        {/await}

    </div>
</div>
