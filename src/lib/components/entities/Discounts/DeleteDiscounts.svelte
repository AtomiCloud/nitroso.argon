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
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    let dialogOpen = false;
    export let discount: DiscountPrincipalRes;

    async function submit() {
        if (valid) await deleteDiscount();
    }

    let submitting = false;

    async function deleteDiscount() {
        submitting = true;
        await toResult(() => $api.vDiscountDelete(discount.id, "1.0"),
            $_('discounts.delete.deleteError', { locale: $lang })).match({
            ok: ok => {
                toast.info($_('discounts.delete.deletedToast', { locale: $lang, values: { name: discount.record.name } }));
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
            <Dialog.Title>{$_('discounts.delete.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify py-2">
                        {$_('discounts.delete.intro', { locale: $lang })}
                    </p>
                    <Alert.Root>
                        <AlertTriangle class="h-4 w-4"/>
                        <Alert.Title>{$_('discounts.delete.takeNote', { locale: $lang })}</Alert.Title>
                        <Alert.Description
                        >{$_('discounts.delete.noteBody', { locale: $lang })}

                        </Alert.Description>
                    </Alert.Root>

                    <p class="text-justify py-2">
                        {$_('discounts.delete.confirmPrefix', { locale: $lang })} <code
                            class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {discount.record.name}
                    </code> {$_('discounts.delete.confirmSuffix', { locale: $lang })}
                    </p>

                    <div class="flex flex-col">
                        <Input placeholder={$_('fields.name', { locale: $lang })}
                               bind:value={confirm}
                        />
                        <div class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-1'}">
                            {$_('discounts.delete.typeNameHint', { locale: $lang })}
                        </div>
                    </div>


                    <Button class="my-2" on:click={submit} disabled={submitting || !valid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('discounts.delete.trigger', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
