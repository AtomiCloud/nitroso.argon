<script lang="ts">
    import {Button, buttonVariants} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {CancelWithdrawalReq, WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {LucideLoader} from "lucide-svelte";
    import {tick} from "svelte";
    import {Textarea} from "$lib/components/ui/textarea";
    import Validation from "$lib/components/core/Validation.svelte";

    export let withdrawal: WithdrawalPrincipalRes;
    export let userId: string;

    let dialogOpen = false;
    let submitting = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}

    const cancelWithdrawalSchema = z.object({
        note: z
            .string()
            .min(2, {message: "Please enter a note."})
            .max(4096, {message: "Note cannot be longer than 4096 characters."})
    });

    type CancelWithdrawal = z.infer<typeof cancelWithdrawalSchema>;
    const val: CancelWithdrawal = {
        note: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = cancelWithdrawalSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<CancelWithdrawalReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    async function submit() {
        onChange("");
        if (errors.length === 0) {
            await cancelWithdrawal(val.note);
        }
    }

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
    $: isValid = errors.length === 0 && Object.entries(taints).length > 0;

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
                    <Validation {errors} {taints} path="note">
                        <Textarea
                                placeholder="Note"
                                bind:value={val.note}
                                on:input={onChange("note")}
                        />
                    </Validation>
                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Cancel
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
