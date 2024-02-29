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
    import {transferObjectSchema} from "$lib/components/entities/Wallets/transfer";

    export let userId: string;

    export let wallet: WalletPrincipalRes;

    // states
    let dialogOpen = false;
    let submitting = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}

    // form validations
    const createWithdrawalSchema = z.object({
        amount: z
            .coerce
            .number()
            .gt(0, "Amount must be greater than 0")
            .max(wallet.usable, "Amount must be less than or equal to your usable balance")
            .finite("Amount must be a finite number"),
        payNowNumber: z.string()
            .min(8, "Not a valid PayNow number")
            .max(12, "Not a valid PayNow number")
            .optional()
    }).required();

    type Withdrawal = z.infer<typeof createWithdrawalSchema>;

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
            userId, "1.0", w), "Failed to make withdrawal")
            .match({
                ok: () => {
                    toast.info(`Successfully requested withdrawal of SGD ${w.amount.toFixed(2)} from your USABLE balance.`);
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
        Make a Withdrawal
    </Dialog.Trigger>
    <Dialog.Content class="max-h-full overflow-scroll">
        <Dialog.Header>
            <Dialog.Title>Make a withdrawal</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        You will be withdrawing from your usable balance in your wallet.
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>Important!</Alert.Title>
                        <Alert.Description
                        >Please ensure you PayNow number is correct before proceeding.
                            <span class="underline"> No compensations </span>
                            will be provided for incorrect PayNow numbers.
                        </Alert.Description
                        >
                    </Alert.Root>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>Withdrawal Duration</Alert.Title>
                        <Alert.Description
                        >Withdrawal is not instant. It will take up to
                            <span class="underline"> 2 working days </span>
                            to be processed.
                        </Alert.Description
                        >
                    </Alert.Root>
                    <Validation {errors} {taints} path="amount">
                        <div class="flex flex-col gap-2 mt-4">
                            <div>
                                Balance: S${wallet.usable.toFixed(2)}
                            </div>
                            <div class="flex gap-2 justify-between items-center">
                                <div class="text-lg">S$</div>
                                 <Input
                                    placeholder="Amount"
                                    inputmode="numeric"
                                    bind:value={val.amount}
                                    on:input={onChange("amount")}/>
                            </div>
                        </div>
                    </Validation>
                    <Validation {errors} {taints} path="payNowNumber">
                        <Input
                                placeholder="PayNow Number to withdraw to"
                                bind:value={val.payNowNumber}
                                on:input={onChange("payNowNumber")}
                        />
                    </Validation>
                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Request Withdrawal
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
