<script lang="ts">


    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import type {TransferReq, UserPrincipalRes} from "$lib/api/core/data-contracts";
    import {Button, buttonVariants} from "$lib/components/ui/button";
    import type {SafeParseError, ZodIssue} from "zod";
    import Validation from "$lib/components/core/Validation.svelte";
    import {Input} from "$lib/components/ui/input";
    import {type TransferObject, transferObjectSchema} from "$lib/components/entities/Wallets/transfer";
    import {tick} from "svelte";
    import {LucideLoader} from "lucide-svelte";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";

    export let user: UserPrincipalRes;

    // states
    let dialogOpen = false;
    let submitting = false;
    let errors: ZodIssue[] = [];
    let taints: Record<string, boolean> = {}


    let val: TransferObject = {
        amount: 0,
        desc: "",
    }

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        const r = transferObjectSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<TransferReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    async function submit() {
        onChange("");
        if (errors.length === 0) {
            const v = transferObjectSchema.parse(val);
            await adminOut(v.amount, v.desc);
        }
    }

    async function adminOut(amount: number, desc: string) {
        submitting = true;
        await toResult(() => $api.vAdminOutflowCreate(
            user?.id ?? "", "1.0", {amount, desc}
        ), "Failed to create admin outflow").match({
            ok: () => {
                toast.info(`Successfully deducted SGD ${amount.toFixed(2)} to user's account.`);
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
        Deduct Usable Balance
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Deduct Usable Balance</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify">
                        You will be deducting usable balance from user
                        <code class="break-all relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                        >{user?.id?.trim() ?? ''}</code>'s
                        account.
                    </p>
                    <Validation {errors} {taints} path="desc">
                        <Input
                                placeholder="Description"
                                bind:value={val.desc}
                                on:input={onChange("desc")}
                        />
                    </Validation>
                    <Validation {errors} {taints} path="amount">

                        <div class="flex gap-2 justify-between items-center">
                            <div class="text-lg">S$</div>
                            <Input
                                    placeholder="Amount"
                                    inputmode="numeric"
                                    bind:value={val.amount}
                                    on:input={onChange("amount")}/>
                        </div>
                    </Validation>
                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Confirm
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
