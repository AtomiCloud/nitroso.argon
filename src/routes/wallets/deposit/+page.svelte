<script lang="ts">
    //@ts-ignore
    import Icon from 'svelte-icons-pack/Icon.svelte';
    import {page} from "$app/stores";
    import {Button} from "$lib/components/ui/button";
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {onMount, tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import Airwallex from 'airwallex-payment-elements';
    import {toResult} from "$lib/utility";
    import {describeFee, isZeroFee, loadFee} from "$lib/api/fee";
    import type {FeeRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {config} from "../../../config/client";
    import {LucideLoader} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber} from "$lib/i18n";
    import DepositAmountSheet from "$lib/components/entities/Wallets/DepositAmountSheet.svelte";


    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}
    let submitting = false;

    // deposit + withdrawal fees (flat SGD + percentage) for the fee notice.
    // While loading or if the endpoint fails (null), the deposit line falls
    // back to "deposits are free" and the withdrawal line to a generic notice
    // — the fees are never hardcoded client-side. A fee of exactly 0% + $0 is
    // disabled and its line is hidden; when both are disabled the whole
    // notice (lines + tooltip) is hidden.
    let depositFee: FeeRes | null = null;
    let withdrawFee: FeeRes | null = null;

    onMount(() => {
        Airwallex.loadAirwallex({
            env: 'prod'
        })
        loadFees();
    })

    async function loadFees() {
        const errorMessage = $_('wallets.deposit.feeLoadFailed', { locale: $lang });
        [depositFee, withdrawFee] = await Promise.all([
            loadFee($api, "Deposit", errorMessage),
            loadFee($api, "Withdrawal", errorMessage),
        ]);
    }

    // localized fee summaries ("4% + S$2.00"); null when the fee is disabled
    // (0% + $0) or unknown — the corresponding line is then hidden or generic
    $: depDesc = depositFee != null && !isZeroFee(depositFee) ? describeFee(depositFee, $_, $lang) : null;
    $: wdDesc = withdrawFee != null && !isZeroFee(withdrawFee) ? describeFee(withdrawFee, $_, $lang) : null;
    // generic while unknown (null), hidden only once the fee is known-zero
    $: showWithdrawLine = !isZeroFee(withdrawFee);

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

                {#if showWithdrawLine || depDesc != null}
                    <div class="flex flex-col items-center gap-0.5 text-sm text-muted-foreground">
                        <span class="flex items-center gap-1">
                            {#if depDesc != null}
                                {$_('wallets.deposit.feeNoticeDeposit', { locale: $lang, values: { desc: depDesc } })}
                            {:else}
                                {$_('wallets.deposit.feeNoticeFree', { locale: $lang })}
                            {/if}
                            {#if depDesc != null && !showWithdrawLine}
                                <InfoTip label={$_('wallets.deposit.feeTooltipDeposit', { locale: $lang, values: { desc: depDesc } })}>
                                    {$_('wallets.deposit.feeTooltipDeposit', { locale: $lang, values: { desc: depDesc } })}
                                </InfoTip>
                            {/if}
                        </span>
                        {#if showWithdrawLine}
                            <span class="flex items-center gap-1">
                                {#if wdDesc != null && depDesc != null}
                                    {$_('wallets.deposit.feeNoticeWithdrawAlso', { locale: $lang, values: { desc: wdDesc } })}
                                {:else if wdDesc != null}
                                    {$_('wallets.deposit.feeNoticeWithdraw', { locale: $lang, values: { desc: wdDesc } })}
                                {:else}
                                    {$_('wallets.deposit.feeNoticeWithdrawGeneric', { locale: $lang })}
                                {/if}
                                <InfoTip label={wdDesc != null
                                    ? $_('wallets.deposit.feeTooltip', { locale: $lang, values: { desc: wdDesc } })
                                    : $_('wallets.deposit.feeTooltipGeneric', { locale: $lang })}>
                                    {#if wdDesc != null}
                                        {$_('wallets.deposit.feeTooltip', { locale: $lang, values: { desc: wdDesc } })}
                                    {:else}
                                        {$_('wallets.deposit.feeTooltipGeneric', { locale: $lang })}
                                    {/if}
                                </InfoTip>
                            </span>
                        {/if}
                    </div>
                {/if}
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
