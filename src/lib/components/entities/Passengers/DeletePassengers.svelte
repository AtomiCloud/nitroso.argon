<script lang="ts">

    import {Button, buttonVariants} from "$lib/components/ui/button";
    import {AlertTriangle, LucideLoader, LucideTrash2} from "lucide-svelte";

    // @ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    // @ts-ignore
    import * as Alert from "$lib/components/ui/alert";
    import type {PassengerPrincipalRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../../../store";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {Input} from "$lib/components/ui/input";

    let dialogOpen = false;
    export let passenger: PassengerPrincipalRes;
    export let userId: string | undefined;

    async function submit() {
        if (valid) await deletePassenger();
    }

    let submitting = false;

    async function deletePassenger() {
        submitting = true;
        await toResult(() => $api.vPassengerDelete(passenger.id, "1.0", {userId}),
            "Failed to delete passenger").match({
            ok: ok => {
                toast.info(`Successfully deleted passenger '${passenger.fullName}'`);
                dialogOpen = false;
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        })
        submitting = false;
        confirm = "";
    }

    let confirm = "";


    $: valid = confirm === passenger.fullName;

</script>

<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Trigger class="{buttonVariants({ variant: 'destructive', size: 'icon' })}">
        <LucideTrash2 class="h-4 w-4"/>
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Delete a passenger</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        Delete a passenger. This action is irreversible.
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>Take Note!</Alert.Title>
                        <Alert.Description
                        >This action cannot be undone.
                        </Alert.Description>
                    </Alert.Root>

                    <p class="text-justify py-2">
                        Please type the name of the passenger, <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {passenger.fullName}
                    </code> to proceed.
                    </p>

                    <div class="flex flex-col">
                        <Input placeholder="Name"
                               bind:value={confirm}
                        />
                        <div class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                            Please type the name of the passenger to proceed.
                        </div>
                    </div>


                    <Button class="my-2" on:click={submit} disabled={submitting || !valid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        Delete Passenger
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
