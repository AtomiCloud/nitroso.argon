<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {CreateDiscountReq, CreateWithdrawalReq, WalletPrincipalRes} from "$lib/api/core/data-contracts";
    import {AlertTriangle, LucideLoader} from "lucide-svelte";
    import {tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import {Input} from "$lib/components/ui/input";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    export let userId: string;

    export let wallet: WalletPrincipalRes;

    // states
    let dialogOpen = false;
    let submitting = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}

    // form validations
    $: createWithdrawalSchema = z.object({
        amount: z
            .coerce
            .number()
            .gt(0, $_('withdrawals.create.amountGreaterThanZero', { locale: $lang }))
            .max(wallet.usable, $_('withdrawals.create.amountExceedsBalance', { locale: $lang }))
            .finite($_('withdrawals.create.amountFinite', { locale: $lang })),
        payNowNumber: z.string()
            .min(8, $_('withdrawals.create.invalidPayNow', { locale: $lang }))
            .max(12, $_('withdrawals.create.invalidPayNow', { locale: $lang }))
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
