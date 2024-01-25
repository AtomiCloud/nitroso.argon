<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, LucideTrash2} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import type {DiscountPrincipalRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {Input} from "$lib/components/ui/input";

    let dialogOpen = false;
    export let discount: DiscountPrincipalRes;

    async function submit() {
        if (valid) await deleteDiscount();
    }

    let submitting = false;

    async function deleteDiscount() {
        submitting = true;
        await toResult(() => $api.vDiscountDelete(discount.id, "1.0"),
            "Failed to delete discount").match({
            ok: ok => {
                toast.info(`Successfully deleted discount '${discount.record.name}'`);
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

    let confirm = "";


    $: valid = confirm === discount.record.name;

</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="{buttonVariants({ variant: 'destructive', size: 'icon' })}">
        <LucideTrash2 class="h-4 w-4"/>
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Delete a discount</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        Delete a discount. This action is irreversible.
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>Take Note!</Alert.Title>
                        <Alert.Description
                        >Discounts are effective the moment they are delete. This action cannot be undone.

                        </Alert.Description>
                    </Alert.Root>

                    <p class="text-justify py-2">
                        Please type the name of the discount, <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {discount.record.name}
                    </code> to proceed.
                    </p>

                    <div class="flex flex-col">
                        <Input placeholder="Name"
                               bind:value={confirm}
                        />
                        <div class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                            Please type the name of the discount to proceed.
                        </div>
                    </div>


                    <Button class="my-2" on:click={submit} disabled={submitting}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Delete Discount
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
