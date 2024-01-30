<script lang="ts">
    import {buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Form from "$lib/components/ui/form";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import {z} from "zod";
    import type {FormOptions} from "formsnap";
    import {LucideLoader} from "lucide-svelte";

    export let withdrawal: WithdrawalPrincipalRes;
    export let userId: string;

    let dialogOpen = false;

    const cancelWithdrawalSchema: any = z.object({
        note: z
            .string()
            .min(2, {message: "Please enter a note."})
            .max(4096, {message: "Note cannot be longer than 4096 characters."})
    });

    const fff: any = undefined;

    const withdrawalOptions: any = {
        SPA: true,
        validators: cancelWithdrawalSchema,
        onUpdate({form}) {
            if (form.valid) {
                cancelWithdrawal(form.data.note);
            }
        },
    } satisfies FormOptions<typeof cancelWithdrawalSchema>;

    let submitting = false;

    async function cancelWithdrawal(note: string) {
        submitting = true;
        await toResult(() => $api.vWithdrawalCancelCreate(withdrawal.id, userId, "1.0", {note}
        ), "Failed to cancel withdrawal").match({
            ok: () => {
                toast.info(`Successfully cancelled the withdrawal of SGD ${withdrawal.record?.amount.toFixed(2)}.`);
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        submitting = false;
    }
</script>
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="w-full lg:max-w-40  {buttonVariants({ variant: 'destructive' })}">
        Cancel
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Cancel withdrawal</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        You are cancelling this withdrawal of S${withdrawal.record.amount.toFixed(2)} to
                        PayNow {withdrawal.record.payNowNumber}.
                    </p>
                    <Form.Root options={withdrawalOptions}
                               schema={cancelWithdrawalSchema}
                               form={fff}
                               let:config>
                        <Form.Field {config} name="note">
                            <Form.Item class="my-4">
                                <Form.Textarea placeholder="Cancel Reason"/>
                                <Form.Validation class="text-sm"/>
                            </Form.Item>
                        </Form.Field>
                        <Form.Button type="submit" class="my-4" disabled={submitting === true} >
                            {#if submitting}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Cancel
                        </Form.Button>
                    </Form.Root>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
