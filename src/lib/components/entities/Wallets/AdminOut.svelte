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
    import {type TransferObject, makeTransferSchema} from "$lib/components/entities/Wallets/transfer";
    import {tick} from "svelte";
    import {LucideLoader} from "lucide-svelte";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    import {_} from "svelte-i18n";
    import {lang, formatMoney} from "$lib/i18n";

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

    // Localized validation schema — rebuilt when the active locale changes so the
    // rendered Zod messages follow the language (AC5).
    $: transferObjectSchema = makeTransferSchema($lang);

    const onChange = (path: string) => async () => {
        await tick();
        taints[path] = true;
        validate();
    }

    function validate() {
        const r = transferObjectSchema.safeParse(val);
        if (!r.success) {
            const e = r as SafeParseError<TransferReq>;
            errors = e.error.errors;
        } else {
            errors = [];
        }
    }

    // Re-run validation whenever the locale-rebuilt schema changes, so an error
    // already on screen re-renders in the new language after a no-reload language
    // switch (AC5). `errors` stores the localized ZodIssue.message captured at
    // parse time; without this the visible message would stay stale until the
    // field is edited. Guarded on taints so it never surfaces errors before the
    // user has interacted.
    $: revalidateOnLocale(transferObjectSchema);

    function revalidateOnLocale(_schema: ReturnType<typeof makeTransferSchema>) {
        if (Object.keys(taints).length === 0) return;
        validate();
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
        ), $_('wallets.adminOut.errorToast', { locale: $lang })).match({
            ok: () => {
                toast.info($_('wallets.adminOut.successToast', { locale: $lang, values: { amount: formatMoney(amount, $lang) } }));
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
        {$_('wallets.adminOut.trigger', { locale: $lang })}
    </Dialog.Trigger>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>{$_('wallets.adminOut.title', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>
                <div class="flex flex-col gap-4">
                    <p class="text-justify">
                        {$_('wallets.adminOut.descriptionBefore', { locale: $lang })}
                        <code class="break-all relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                        >{user?.id?.trim() ?? ''}</code>{$_('wallets.adminOut.descriptionAfter', { locale: $lang })}
                    </p>
                    <Validation {errors} {taints} path="desc">
                        <Input
                                placeholder={$_('fields.description', { locale: $lang })}
                                bind:value={val.desc}
                                on:input={onChange("desc")}
                        />
                    </Validation>
                    <Validation {errors} {taints} path="amount">

                        <div class="flex gap-2 justify-between items-center">
                            <div class="text-lg">S$</div>
                            <Input
                                    placeholder={$_('fields.amount', { locale: $lang })}
                                    inputmode="numeric"
                                    bind:value={val.amount}
                                    on:input={onChange("amount")}/>
                        </div>
                    </Validation>
                    <Button class="my-2" on:click={submit} disabled={submitting || !isValid}>
                        {#if submitting}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {/if}
                        {$_('actions.confirm', { locale: $lang })}
                    </Button>
                </div>
            </Dialog.Description>
        </Dialog.Header>
    </Dialog.Content>
</Dialog.Root>
