<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    //@ts-ignore
    import * as Tooltip from "$lib/components/ui/tooltip";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {toResult} from "$lib/utility";
    import {loadWithdrawFeeRate} from "$lib/api/fee";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {CreateDiscountReq, CreateWithdrawalReq, WalletPrincipalRes} from "$lib/api/core/data-contracts";
    import {AlertTriangle, Info, LucideLoader} from "lucide-svelte";
    import {tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import {Input} from "$lib/components/ui/input";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber} from "$lib/i18n";

    export let userId: string;

    export let wallet: WalletPrincipalRes;

    // states
    let dialogOpen = false;
    let submitting = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}

    // withdrawal fee rate (e.g. 0.04 = 4%). Loaded lazily when the dialog
    // opens; on failure the fee breakdown is simply hidden.
    let feeRate: number | null = null;
    let feeRequested = false;

    $: if (dialogOpen && !feeRequested) {
        feeRequested = true;
        loadFeeRate();
    }

    async function loadFeeRate() {
        feeRate = await loadWithdrawFeeRate($api, $_('withdrawals.create.feeLoadFailed', { locale: $lang }));
    }

    // form validations
    $: createWithdrawalSchema = z.object({
        amount: z
            .coerce
            .number()
            .gt(0, $_('withdrawals.create.amountGreaterThanZero', { locale: $lang }))
            .max(wallet.usable, $_('withdrawals.create.amountExceedsBalance', { locale: $lang }))
            .finite($_('withdrawals.create.amountFinite', { locale: $lang })),
        payNowNumber: z.string()
            .regex(/^\d{8}$/, $_('withdrawals.create.invalidPayNow', { locale: $lang }))
            .optional()
    }).required();

    type Withdrawal = { amount: number; payNowNumber?: string };

    const val: Withdrawal = {
        amount: 0,
        payNowNumber: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = createWithdrawalSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<CreateDiscountReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    async function submit() {
        onChange("");
        if (errors.length === 0) {

            const v = createWithdrawalSchema.parse(val);
            await makeWithdrawal({
                amount: v.amount,
                payNowNumber: v.payNowNumber,
            });

        }
    }

    async function makeWithdrawal(w: CreateWithdrawalReq) {
        submitting = true;
        await toResult(() => $api.vWithdrawalCreate(
            userId, "1.0", w), $_('withdrawals.create.failed', { locale: $lang }))
            .match({
                ok: () => {
                    toast.info($_('withdrawals.create.success', { locale: $lang, values: { amount: formatMoney(w.amount, $lang) } }));
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


    $: isValid = errors.length === 0 && Object.entries(taints).length > 0;

    // live fee breakdown (display only — the server computes the authoritative
    // fee with banker's rounding on approval)
    $: amountNum = Number(val.amount);
    $: showFeeBreakdown = feeRate != null && Number.isFinite(amountNum) && amountNum > 0 && amountNum <= wallet.usable;
    $: feeAmount = Math.round(amountNum * (feeRate ?? 0) * 100) / 100;
    $: netAmount = Math.round((amountNum - feeAmount) * 100) / 100;
    $: feeRatePercent = formatNumber((feeRate ?? 0) * 100, $lang, {maximumFractionDigits: 2});
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
                                <span>{$_('withdrawals.create.feeLine', { locale: $lang, values: { rate: feeRatePercent, fee: formatMoney(feeAmount, $lang) } })}</span>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Info class="h-4 w-4"/>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content class="max-w-72">
                                        <p class="text-justify">{$_('withdrawals.create.feeTooltip', { locale: $lang, values: { rate: feeRatePercent } })}</p>
                                    </Tooltip.Content>
                                </Tooltip.Root>
                            </div>
                            <div class="font-semibold">{$_('withdrawals.create.youReceive', { locale: $lang, values: { net: formatMoney(netAmount, $lang) } })}</div>
                        </div>
                    {/if}
                    <Validation {errors} {taints} path="payNowNumber">
                        <Input
                                placeholder={$_('withdrawals.create.payNowPlaceholder', { locale: $lang })}
                                bind:value={val.payNowNumber}
                                on:input={onChange("payNowNumber")}
                        />
                    </Validation>
                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid}>
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
