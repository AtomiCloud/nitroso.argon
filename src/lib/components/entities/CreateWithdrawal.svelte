<script lang="ts">
    import {buttonVariants} from "$lib/components/ui/button/index.js";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Form from "$lib/components/ui/form";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {z} from "zod";
    import type {FormOptions} from "formsnap";
    import {toResult} from "$lib/utility";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {WalletPrincipalRes} from "$lib/api/core/data-contracts";
    import {AlertTriangle} from "lucide-svelte";

    export let userId: string;

    export let wallet: WalletPrincipalRes;

    let dialogOpen = false;

    let fff: any = undefined;

    const createWithdrawalSchema: any = z.object({
        amount: z
            .coerce
            .number()
            .min(0, "Amount must be greater than 0")
            .max(wallet.usable, "Amount must be less than or equal to your usable balance")
            .finite("Amount must be a finite number"),
        payNowNumber: z.string()
            .min(8, "Not a valid PayNow number")
            .max(12, "Not a valid PayNow number")
            .optional()
    });
    const withdrawal: any = {
        SPA: true,
        validators: createWithdrawalSchema,
        onUpdate({form}) {
            if (form.valid) {
                makeWithdrawal(form.data.amount, form.data.payNowNumber!);
            }
        },
    } satisfies  FormOptions<typeof createWithdrawalSchema> ;



    async function makeWithdrawal(amount: number, payNowNumber: string) {
        await toResult(() => $api.vWithdrawalCreate(
            userId, "1.0", {
                amount,
                payNowNumber,
            }
        ), "Failed to make withdrawal").match({
            ok: () => {
                toast.info(`Successfully requested withdrawal of SGD ${amount.toFixed(2)} from your USABLE balance.`);
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail);
            }
        })
    }

</script>
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full max-w-80  {buttonVariants({ variant: 'default' })}">
        Make a Withdrawal
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Make a withdrawal</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        You will be withdrawing from your usable balance in your wallet.
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4" />
                        <Alert.Title>Take Note!</Alert.Title>
                        <Alert.Description
                        >Please ensure you PayNow number is correct before proceeding.
                            <span class="underline"> No compensations </span>
                            will be provided for wrong PayNow numbers.
                        </Alert.Description
                        >
                    </Alert.Root>
                    <Form.Root
                            options={withdrawal}
                            schema={createWithdrawalSchema}
                            form={fff}
                               let:config>
                        <Form.Field {config} name="amount">
                            <Form.Item class="my-4">
                                <Form.Input inputmode="numeric" placeholder="Amount">
                                    S$
                                </Form.Input>
                                <Form.Description class="px-2">
                                    Balance: S$ {wallet.usable.toFixed(2)}
                                </Form.Description>
                                <Form.Validation class="text-sm"/>
                            </Form.Item>
                        </Form.Field>
                        <Form.Field {config} name="payNowNumber">
                            <Form.Item class="my-4">
                                <Form.Input placeholder="PayNow Number to withdraw to"/>
                                <Form.Validation class="text-sm"/>
                            </Form.Item>
                        </Form.Field>
                        <Form.Button type="submit" class="my-4">Make Withdrawal Request</Form.Button>
                    </Form.Root>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
