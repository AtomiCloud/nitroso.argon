<script lang="ts">
    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {page} from "$app/stores";
    import {Button} from "$lib/components/ui/button";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Tooltip from "$lib/components/ui/tooltip";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {onMount, tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import Airwallex from 'airwallex-payment-elements';
    import {toResult} from "$lib/utility";
    import {loadWithdrawFeeRate} from "$lib/api/fee";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {config} from "../../../config/client";
    import {Info, LucideLoader} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber} from "$lib/i18n";
    import DepositAmountSheet from "$lib/components/entities/Wallets/DepositAmountSheet.svelte";


    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}
    let submitting = false;

    // withdrawal fee rate (e.g. 0.04 = 4%), shown in the "deposits are free"
    // notice. While loading or if the endpoint fails, a generic notice without
    // the percentage is shown instead — the rate is never hardcoded client-side.
    let feeRate: number | null = null;
    let feeTipOpen = false;

    onMount(() => {
        Airwallex.loadAirwallex({
            env: 'prod'
        })
        loadFeeRate();
    })

    async function loadFeeRate() {
        feeRate = await loadWithdrawFeeRate($api, $_('wallets.deposit.feeLoadFailed', { locale: $lang }));
    }

    $: feeRatePercent = feeRate != null ? formatNumber(feeRate * 100, $lang, {maximumFractionDigits: 2}) : null;

    // Localized validation schema — rebuilt when the active locale changes so the
    // rendered Zod messages follow the language (AC5). Sourced from the
    // `validation.topup.*` catalog keys, SSR-safe via the explicit `{ locale }`,
    // mirroring the in-component pattern in CreateWithdrawal.svelte.
    $: topUpSchema = z.object({
        amount: z
            .coerce
            .number()
            .gte(5, $_('validation.topup.min', { locale: $lang, values: { min: 5 } }))
            .finite($_('validation.topup.finite', { locale: $lang }))
            .refine(x => {
                const r = x.toString().split(".")
                if (r.length == 2) return r[1].length <= 2
                return true;
            }, $_('validation.topup.precision', { locale: $lang, values: { max: 2 } }))
    });
    type TopUpModel = z.infer<typeof topUpSchema>;

    let value = {
        amount: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        validate();
    }

    function validate() {
        const r = topUpSchema.safeParse(value);
        if (!r.success) {
            const e = r as SafeParseError<TopUpModel>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    // Amount entry happens exclusively in the bottom-sheet keypad
    // (DepositAmountSheet). The page-level readout is a plain button, so the
    // device keyboard can never open here.
    let sheetOpen = false;

    // Confirm from the sheet writes the plain decimal string (e.g. "12.50")
    // into the model and re-enters the exact same onChange/taint/zod path the
    // old inline input used. Cancel/backdrop/X/Escape never reach this.
    function confirmAmount(e: CustomEvent<string>) {
        value.amount = e.detail;
        sheetOpen = false;
        onChange('amount')();
    }

    // Locale-aware page readout of the confirmed amount, always 2 decimals.
    $: displayAmount = formatNumber(
        Number.isFinite(Number(value.amount)) ? Number(value.amount || 0) : 0,
        $lang,
        {minimumFractionDigits: 2, maximumFractionDigits: 2},
    );

    // Re-run validation whenever the locale-rebuilt schema changes, so an error
    // already on screen re-renders in the new language after a no-reload language
    // switch (AC5). `errors` stores the localized ZodIssue.message captured at
    // parse time, so without this the visible message would stay stale until the
    // field is edited. Guarded on taints so it never surfaces errors before the
    // user has interacted.
    $: revalidateOnLocale(topUpSchema);

    function revalidateOnLocale(_schema: typeof topUpSchema) {
        if (Object.keys(taints).length === 0) return;
        validate();
    }

    async function submit() {
        onChange("");
        if (errors.length === 0) {
            submitting = true;
            const v = topUpSchema.parse(value);
            const wId = $page.data.user?.wallet?.id;
            const uId = $page.data.user?.principal?.id;
            await toResult(() => $api.vPaymentCreate(wId, "1.0", {
                amount: v.amount,
                currency: "SGD",
            }, {
                userId: uId,
            }), $_('wallets.deposit.initError', { locale: $lang }))
                .match({
                    err: e => {
                        console.error(e);
                        toast.error(e.detail ?? e.type);
                    },
                    ok: o => {
                        Airwallex.redirectToCheckout({
                            env: 'prod',
                            intent_id: o.externalReference,
                            client_secret: o.secret,
                            currency: "SGD",
                            successUrl: `${config.baseUrl}/wallets/deposit/success`,
                            failUrl: `${config.baseUrl}/wallets/deposit/failed`,
                            cancelUrl: `${config.baseUrl}/wallets/deposit/cancel`,
                        })
                    }
                });
            submitting = false;
        }
    }

    $: isValid = errors.length === 0 && Object.entries(taints).length > 0;


</script>

<div class="flex flex-col items-center w-11/12 max-w-[1200px] mx-auto my-12 md:my-24">
    <Card.Root class="w-full max-w-lg">
        <Card.Header>
            <Card.Title class="text-3xl">{$_('wallets.deposit.title', { locale: $lang })}</Card.Title>
            <Card.Description>{$_('wallets.deposit.subtitle', { locale: $lang })}</Card.Description>
        </Card.Header>
        <Card.Content>
            <div class="flex flex-col gap-6">
                <div class="flex flex-col items-center gap-1 rounded-lg bg-muted py-6">
                    <div class="text-3xl font-light">{formatMoney($page.data.user?.wallet?.usable ?? 0, $lang)}</div>
                    <div class="text-sm text-muted-foreground">{$_('fields.balance', { locale: $lang })}</div>
                </div>

                <div class="text-center text-sm text-muted-foreground">
                    {$_('wallets.deposit.prompt', { locale: $lang })}
                </div>

                <Validation {errors} {taints} path="amount" classNames="items-center">
                    <!-- A plain button (not an input) — tapping opens the keypad
                         sheet and can never summon the device keyboard. -->
                    <button type="button"
                            class="group flex flex-col items-center gap-1"
                            aria-label={$_('wallets.deposit.amountLabel', { locale: $lang })}
                            on:click={() => sheetOpen = true}>
                        <span class="flex gap-2 items-baseline text-4xl {value.amount === '' ? 'text-muted-foreground' : ''}">
                            <span>S$</span>
                            <span class="tabular-nums">{displayAmount}</span>
                        </span>
                        <span class="text-sm text-primary group-hover:underline">
                            {$_('wallets.deposit.enterAmount', { locale: $lang })}
                        </span>
                    </button>
                </Validation>

                <div class="flex flex-col items-center gap-0.5 text-sm text-muted-foreground">
                    <span>{$_('wallets.deposit.feeNoticeFree', { locale: $lang })}</span>
                    <span class="flex items-center gap-1">
                        {#if feeRatePercent != null}
                            {$_('wallets.deposit.feeNoticeWithdraw', { locale: $lang, values: { rate: feeRatePercent } })}
                        {:else}
                            {$_('wallets.deposit.feeNoticeWithdrawGeneric', { locale: $lang })}
                        {/if}
                        <Tooltip.Root bind:open={feeTipOpen}>
                            <!-- tap toggles on touch devices: hover-only tooltips
                                 are unreachable on mobile; desktop keeps hover -->
                            <Tooltip.Trigger on:pointerdown={(e) => {
                                const pe = ((e as any).detail?.originalEvent ?? e) as PointerEvent;
                                if (pe.pointerType === 'touch') feeTipOpen = !feeTipOpen;
                            }}>
                                <Info class="h-4 w-4"/>
                            </Tooltip.Trigger>
                            <Tooltip.Content class="max-w-72">
                                <p class="text-justify">
                                    {#if feeRatePercent != null}
                                        {$_('wallets.deposit.feeTooltip', { locale: $lang, values: { rate: feeRatePercent } })}
                                    {:else}
                                        {$_('wallets.deposit.feeTooltipGeneric', { locale: $lang })}
                                    {/if}
                                </p>
                            </Tooltip.Content>
                        </Tooltip.Root>
                    </span>
                </div>
            </div>
        </Card.Content>
        <Card.Footer>
            <Button class="w-full text-lg py-6" on:click={submit} disabled={submitting || !isValid}>
                {#if submitting}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {/if}
                {$_('wallets.deposit.title', { locale: $lang })}
            </Button>
        </Card.Footer>
    </Card.Root>
</div>

<DepositAmountSheet open={sheetOpen}
                    amount={value.amount}
                    on:confirm={confirmAmount}
                    on:close={() => sheetOpen = false}/>
