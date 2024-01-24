<script lang="ts">
    import {buttonVariants} from "$lib/components/ui/button/index.js";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Form from "$lib/components/ui/form";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {toResult} from "$lib/utility";
    import {api} from "../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import {z} from "zod";
    import type {FormOptions} from "formsnap";
    import {LucideLoader} from "lucide-svelte";

    export let withdrawal: WithdrawalPrincipalRes;

    let dialogOpen = false;

    const fff: any = undefined;

    const rejectWithdrawalSchema: any = z.object({
        note: z
            .string()
            .min(2, {message: "Please enter a note."})
            .max(4096, {message: "Note cannot be longer than 4096 characters."})
    });

    const withdrawalOptions: any = {
        SPA: true,
        validators: rejectWithdrawalSchema,
        onUpdate({form}) {
            if (form.valid) {
                rejectWithdrawal(form.data.note);
            }
        },
    } satisfies  FormOptions<typeof rejectWithdrawalSchema>;

    let submitting = false;

    async function rejectWithdrawal(note: string) {
        submitting = true;
        await toResult(() => $api.vWithdrawalRejectCreate(withdrawal.id, "1.0", {note}
        ), "Failed to reject withdrawal").match({
            ok: () => {
                toast.info(`Successfully rejected the withdrawal of SGD ${withdrawal.record?.amount.toFixed(2)}.`);
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
        Reject
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Reject withdrawal</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        You are rejecting this withdrawal of S${withdrawal.record.amount.toFixed(2)} to
                        PayNow {withdrawal.record.payNowNumber}.
                    </p>
                    <Form.Root
                            options={withdrawalOptions}
                            schema={rejectWithdrawalSchema}
                            form={fff}
                               let:config>
                        <Form.Field {config} name="note">
                            <Form.Item class="my-4">

                                <Form.Textarea placeholder="Note"/>

                                <Form.Validation class="text-sm"/>
                            </Form.Item>
                        </Form.Field>
                        <Form.Button type="submit" class="my-4" disabled={submitting === true}>
                            {#if submitting}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            Reject
                        </Form.Button>
                    </Form.Root>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
