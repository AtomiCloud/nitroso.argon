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
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

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
            $_('passengers.delete.errorToast', { locale: $lang })).match({
            ok: ok => {
                toast.info($_('passengers.delete.successToast', { locale: $lang, values: { name: passenger.fullName } }));
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
            <Dialog.Title>{$_('passengers.delete.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('passengers.delete.subtitle', { locale: $lang })}
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('passengers.alert.takeNote', { locale: $lang })}</Alert.Title>
                        <Alert.Description
                        >{$_('passengers.delete.cannotUndo', { locale: $lang })}
                        </Alert.Description>
                    </Alert.Root>

                    <p class="text-justify py-2">
                        {$_('passengers.delete.confirmLead', { locale: $lang })} <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {passenger.fullName}
                    </code> {$_('passengers.delete.confirmTrail', { locale: $lang })}
                    </p>

                    <div class="flex flex-col">
                        <Input placeholder={$_('fields.name', { locale: $lang })}
                               bind:value={confirm}
                        />
                        <div class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                            {$_('passengers.delete.confirmHint', { locale: $lang })}
                        </div>
                    </div>


                    <Button class="my-2" on:click={submit} disabled={submitting || !valid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('passengers.delete.submit', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
