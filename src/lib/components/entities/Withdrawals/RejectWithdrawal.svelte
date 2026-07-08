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
    import type {RejectWithdrawalReq, WithdrawalPrincipalRes} from "$lib/api/core/data-contracts";
    import {type SafeParseError, z, type ZodIssue} from "zod";
    import {LucideLoader} from "lucide-svelte";
    import {tick} from "svelte";
    import Validation from "$lib/components/core/Validation.svelte";
    import {Textarea} from "$lib/components/ui/textarea";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

    export let withdrawal: WithdrawalPrincipalRes;
    // Optional trigger copy override — the RequireManualIntervention alert
    // reuses this flow but labels the action "Reject & refund".
    export let triggerLabel: string | null = null;

    let dialogOpen = false;
    let submitting = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}

    $: rejectWithdrawalSchema = z.object({
        note: z
            .string()
            .min(2, {message: $_('withdrawals.reject.noteRequired', { locale: $lang })})
            .max(4096, {message: $_('withdrawals.reject.noteTooLong', { locale: $lang })})
    });

    type RejectWithdrawal = { note: string };

    const val: RejectWithdrawal = {
        note: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = rejectWithdrawalSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<RejectWithdrawalReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }


    async function submit() {
        onChange("");
        if (errors.length === 0) {
            await rejectWithdrawal(val.note);
        }
    }

    async function rejectWithdrawal(note: string) {
        submitting = true;
        await toResult(() => $api.vWithdrawalRejectCreate(withdrawal.id, "1.0", {note}
        ), $_('withdrawals.reject.failed', { locale: $lang })).match({
            ok: () => {
                toast.info($_('withdrawals.reject.success', { locale: $lang, values: { amount: formatMoney(withdrawal.record?.amount ?? 0, $lang) } }));
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
        {triggerLabel ?? $_('actions.reject', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('withdrawals.reject.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('withdrawals.reject.confirm', { locale: $lang, values: { amount: formatMoney(withdrawal.record.amount, $lang), payNowNumber: withdrawal.record.payNowNumber } })}
                    </p>
                    <Validation {errors} {taints} path="note">
                        <Textarea
                                placeholder={$_('fields.notes', { locale: $lang })}
                                bind:value={val.note}
                                on:input={onChange("note")}
                        />
                    </Validation>
                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('actions.reject', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
