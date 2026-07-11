<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import InfoTip from "$lib/components/core/InfoTip.svelte";
    import {type SafeParseError, type ZodIssue} from "zod";
    import {toResult} from "$lib/utility";
    import {calcFee, describeFee, isZeroFee, loadFee, roundToEvenCents} from "$lib/api/fee";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {FeeRes, RefundablePoolRes, WalletPrincipalRes} from "$lib/api/core/data-contracts";
    import {AlertTriangle, CreditCard, LucideLoader, Smartphone} from "lucide-svelte";
    import {tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import {Input} from "$lib/components/ui/input";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";
    import {
        makeCreateWithdrawalSchema,
        toCreateWithdrawalReq,
        type WithdrawalMethod,
    } from "./withdrawal";

    // Airwallex PayNow payouts are not enabled yet — the PayNow option renders
    // disabled ("temporarily unavailable") but ALL its form logic stays intact
    // behind this flag, so re-enabling is this one const.
    const PAYNOW_ENABLED = false;

    export let userId: string;

    export let wallet: WalletPrincipalRes;

    // states
    let dialogOpen = false;
    let submitting = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}

    // CardRefund is the default (and, while PAYNOW_ENABLED is false, the only
    // selectable) method.
    let method: WithdrawalMethod = "CardRefund";

    // withdrawal fee (flat SGD + percentage, e.g. 4 = 4%). Loaded lazily when
    // the dialog opens; on failure the fee breakdown is simply hidden. The same
    // fee applies to both methods (zinc charges it on the rail-agnostic gross).
    let feeInfo: FeeRes | null = null;
    let feeRequested = false;

    // card-refundable pool: how much of the wallet can go back onto the user's
    // cards right now, and the payment window it was computed over. null while
    // loading; poolFailed on fetch error (the card option then explains itself
    // and submission is blocked — the server re-checks anyway).
    let refundable: RefundablePoolRes | null = null;
    let poolRequested = false;
    let poolFailed = false;

    $: if (dialogOpen && !feeRequested) {
        feeRequested = true;
        loadFeeInfo();
    }

    $: if (dialogOpen && !poolRequested) {
        poolRequested = true;
        loadRefundable();
    }

    async function loadFeeInfo() {
        feeInfo = await loadFee($api, "Withdrawal", $_('withdrawals.create.feeLoadFailed', { locale: $lang }));
    }

    async function loadRefundable() {
        await toResult(() => $api.vWithdrawalRefundableDetail(userId, "1.0"),
            $_('withdrawals.create.poolLoadFailed', { locale: $lang }))
            .match({
                ok: (p) => {
                    refundable = p;
                    poolFailed = false;
                },
                err: (e) => {
                    console.error(e);
                    poolFailed = true;
                }
            });
    }

    // form validations — rebuilt per method / pool / locale so bounds and
    // messages always match the current state
    $: createWithdrawalSchema = makeCreateWithdrawalSchema($lang, {
        usable: wallet.usable,
        method,
        pool: refundable?.pool ?? null,
    });

    type Withdrawal = { amount: number; payNowNumber?: string };

    const val: Withdrawal = {
        amount: 0,
        payNowNumber: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        validate();
    }

    function validate() {
        const r = createWithdrawalSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<Withdrawal>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    // re-validate when the schema itself changes (method switch, pool arriving,
    // locale switch) so a stale bound never gates or un-gates the submit
    $: revalidateOnSchema(createWithdrawalSchema);

    function revalidateOnSchema(_schema: ReturnType<typeof makeCreateWithdrawalSchema>) {
        if (Object.keys(taints).length === 0) return;
        validate();
    }

    function selectMethod(m: WithdrawalMethod) {
        if (m === "PayNow" && !PAYNOW_ENABLED) return;
        method = m;
    }

    async function submit() {
        onChange("");
        if (errors.length === 0 && methodAvailable) {
            const v = createWithdrawalSchema.parse(val);
            await makeWithdrawal(v);
        }
    }

    async function makeWithdrawal(v: Withdrawal) {
        submitting = true;
        await toResult(() => $api.vWithdrawalCreate(
            userId, "1.0", toCreateWithdrawalReq(method, v)), $_('withdrawals.create.failed', { locale: $lang }))
            .match({
                ok: () => {
                    toast.info($_('withdrawals.create.success', { locale: $lang, values: { amount: formatMoney(v.amount, $lang) } }));
                    dialogOpen = false;
                    invalidateAll();
                },
                err: (e) => {
                    console.error(e);
                    toast.error(e.detail);
                }
            })
        submitting = false;
    }

    // the card option is usable once the pool has loaded and is positive; when
    // it is 0 or failed to load the option stays visible but explains why and
    // (with PayNow disabled too) the submit stays blocked
    $: poolUsable = refundable != null && refundable.pool > 0;
    $: methodAvailable = method === "CardRefund" ? poolUsable : PAYNOW_ENABLED;

    $: isValid = errors.length === 0 && Object.entries(taints).length > 0;

    // live fee breakdown (display only — flat + percentage with banker's
    // rounding, capped at the amount, matching the server's authoritative
    // FeeCalculator cent-for-cent). Shared by both methods. A fee of exactly
    // 0% + $0 means the fee is disabled: net == gross, so the whole breakdown
    // (including the "you'll receive" line) is hidden; null means the fee
    // failed to load and the breakdown is hidden too.
    $: amountNum = Number(val.amount);
    $: showFeeBreakdown = feeInfo != null && !isZeroFee(feeInfo) && Number.isFinite(amountNum) && amountNum > 0 && amountNum <= wallet.usable;
    $: feeAmount = feeInfo != null && Number.isFinite(amountNum) ? calcFee(feeInfo, amountNum) : 0;
    $: netAmount = roundToEvenCents(amountNum - feeAmount);
    $: feeDesc = feeInfo != null ? describeFee(feeInfo, $_, $lang) : "";
</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full max-w-80  {buttonVariants({ variant: 'default' })}">
        {$_('withdrawals.create.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content class="max-h-full overflow-scroll">
        <Dialog.Header>
            <Dialog.Title>{$_('withdrawals.create.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('withdrawals.create.intro', { locale: $lang })}
                    </p>

                    <!-- method selector: two large option cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label={$_('withdrawals.create.methodLabel', { locale: $lang })}>
                        <button
                                type="button"
                                role="radio"
                                aria-checked={method === "CardRefund"}
                                class="flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors
                                       {method === 'CardRefund' ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:bg-muted'}"
                                on:click={() => selectMethod("CardRefund")}>
                            <span class="flex items-center gap-2 font-semibold text-foreground">
                                <CreditCard class="h-4 w-4"/>
                                {$_('withdrawals.create.methodCardRefund', { locale: $lang })}
                            </span>
                            <span class="text-xs text-muted-foreground">
                                {$_('withdrawals.create.methodCardRefundDesc', { locale: $lang })}
                            </span>
                        </button>
                        <button
                                type="button"
                                role="radio"
                                aria-checked={method === "PayNow"}
                                disabled={!PAYNOW_ENABLED}
                                class="flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors
                                       {method === 'PayNow' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}
                                       {PAYNOW_ENABLED ? 'hover:bg-muted' : 'opacity-50 cursor-not-allowed'}"
                                on:click={() => selectMethod("PayNow")}>
                            <span class="flex items-center gap-2 font-semibold text-foreground">
                                <Smartphone class="h-4 w-4"/>
                                {$_('withdrawals.create.methodPayNow', { locale: $lang })}
                            </span>
                            <span class="text-xs text-muted-foreground">
                                {#if PAYNOW_ENABLED}
                                    {$_('withdrawals.create.methodPayNowDesc', { locale: $lang })}
                                {:else}
                                    {$_('withdrawals.create.methodPayNowUnavailable', { locale: $lang })}
                                {/if}
                            </span>
                        </button>
                    </div>

                    {#if method === "CardRefund"}
                        <!-- refundable pool: how much can go back onto the cards -->
                        {#if refundable == null && !poolFailed}
                            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                <LucideLoader class="h-4 w-4 animate-spin"/>
                                {$_('withdrawals.create.poolLoading', { locale: $lang })}
                            </div>
                        {:else if poolFailed}
                            <Alert.Root>
                                <AlertTriangle class="h-4 w-4"/>
                                <Alert.Title>{$_('withdrawals.create.poolUnavailableTitle', { locale: $lang })}</Alert.Title>
                                <Alert.Description>{$_('withdrawals.create.poolUnavailable', { locale: $lang })}</Alert.Description>
                            </Alert.Root>
                        {:else if refundable != null && refundable.pool <= 0}
                            <Alert.Root>
                                <AlertTriangle class="h-4 w-4"/>
                                <Alert.Title>{$_('withdrawals.create.poolEmptyTitle', { locale: $lang })}</Alert.Title>
                                <Alert.Description>{$_('withdrawals.create.poolEmpty', { locale: $lang, values: { windowDays: refundable.windowDays } })}</Alert.Description>
                            </Alert.Root>
                        {:else if refundable != null}
                            <p class="text-sm">
                                {$_('withdrawals.create.poolLine', { locale: $lang, values: { pool: formatMoney(refundable.pool, $lang), windowDays: refundable.windowDays } })}
                            </p>
                        {/if}
                    {:else}
                        <Alert.Root>
                            <AlertTriangle class="h-4 w-4"/>
                            <Alert.Title>{$_('withdrawals.create.importantTitle', { locale: $lang })}</Alert.Title>
                            <Alert.Description
                            >{$_('withdrawals.create.payNowWarningPrefix', { locale: $lang })}
                                <span class="underline"> {$_('withdrawals.create.payNowWarningEmphasis', { locale: $lang })} </span>
                                {$_('withdrawals.create.payNowWarningSuffix', { locale: $lang })}
                            </Alert.Description
                            >
                        </Alert.Root>
                    {/if}
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('withdrawals.create.durationTitle', { locale: $lang })}</Alert.Title>
                        <Alert.Description
                        >{$_('withdrawals.create.durationPrefix', { locale: $lang })}
                            <span class="underline"> {$_('withdrawals.create.durationEmphasis', { locale: $lang })} </span>
                            {$_('withdrawals.create.durationSuffix', { locale: $lang })}
                        </Alert.Description
                        >
                    </Alert.Root>
                    <Validation {errors} {taints} path="amount">
                        <div class="flex flex-col gap-2 mt-4">
                            <div>
                                {$_('withdrawals.create.balanceLabel', { locale: $lang, values: { amount: formatMoney(wallet.usable, $lang) } })}
                            </div>
                            <div class="flex gap-2 justify-between items-center">
                                <div class="text-lg">S$</div>
                                 <Input
                                    placeholder={$_('fields.amount', { locale: $lang })}
                                    inputmode="numeric"
                                    bind:value={val.amount}
                                    on:input={onChange("amount")}/>
                            </div>
                        </div>
                    </Validation>
                    {#if showFeeBreakdown}
                        <div class="flex flex-col gap-1 text-sm">
                            <div class="flex items-center gap-1 text-muted-foreground">
                                <span>{$_('withdrawals.create.feeLine', { locale: $lang, values: { desc: feeDesc, fee: formatMoney(feeAmount, $lang) } })}</span>
                                <InfoTip label={$_('withdrawals.create.feeTooltip', { locale: $lang, values: { desc: feeDesc } })}>
                                    {$_('withdrawals.create.feeTooltip', { locale: $lang, values: { desc: feeDesc } })}
                                </InfoTip>
                            </div>
                            <div class="font-semibold">{$_('withdrawals.create.youReceive', { locale: $lang, values: { net: formatMoney(netAmount, $lang) } })}</div>
                        </div>
                    {/if}
                    {#if method === "PayNow"}
                        <Validation {errors} {taints} path="payNowNumber">
                            <Input
                                    placeholder={$_('withdrawals.create.payNowPlaceholder', { locale: $lang })}
                                    bind:value={val.payNowNumber}
                                    on:input={onChange("payNowNumber")}
                            />
                        </Validation>
                    {/if}
                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid || !methodAvailable}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('withdrawals.create.submit', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
