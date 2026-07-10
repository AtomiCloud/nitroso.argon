<script lang="ts">
    import {buttonVariants, Button} from "$lib/components/ui/button";

    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";

    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    import {Calendar} from "$lib/components/ui/calendar";
    import {Input} from "$lib/components/ui/input";
    import {CalendarIcon, Flag, LucideLoader, LucideTrash2} from "lucide-svelte";
    import type {DateValue} from "@internationalized/date";
    import {getLocalTimeZone} from "@internationalized/date";
    import type {MilestonePrincipalRes} from "$lib/api/core/data-contracts";
    import {toResult} from "$lib/utility";
    import {api} from "../../store";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate} from "$lib/i18n";
    import {cn} from "$lib/utils";

    // Admin-only milestone management, opened off the "From milestone" select.
    // The list endpoint is authed for everyone; create/delete are admin-only on
    // zinc, and the whole affordance is hidden for non-admins by the parent.
    export let milestones: MilestonePrincipalRes[];
    // zinc's dd-MM-yyyy formatter, shared with the page
    export let toApiDate: (d: DateValue) => string;
    // re-fetch the milestone list after a create/delete
    export let reload: () => Promise<void>;

    let open = false;
    let busy = false;
    let newLabel = "";
    let newDate: DateValue | undefined;
    // two-tap delete confirm (mobile-friendly: no nested dialog): first tap
    // arms the row, second tap on the red button actually deletes
    let armed: string | null = null;

    // reset transient state whenever the dialog closes
    $: if (!open) {
        armed = null;
        newLabel = "";
        newDate = undefined;
    }

    async function create() {
        if (newDate == null || newLabel.trim().length === 0) return;
        busy = true;
        await toResult(() => $api.vMilestoneCreate("1", {date: toApiDate(newDate!), label: newLabel.trim()}),
            $_('stats.milestone.createFailed', { locale: $lang })).match({
            ok: async () => {
                toast.info($_('stats.milestone.created', { locale: $lang }));
                newLabel = "";
                newDate = undefined;
                await reload();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        busy = false;
    }

    async function remove(id: string) {
        busy = true;
        await toResult(() => $api.vMilestoneDelete(id, "1"),
            $_('stats.milestone.deleteFailed', { locale: $lang })).match({
            ok: async () => {
                toast.info($_('stats.milestone.deleted', { locale: $lang }));
                armed = null;
                await reload();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        busy = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Trigger class="{buttonVariants({ variant: 'outline' })} h-8 px-2 shrink-0"
                    aria-label={$_('stats.milestone.manage', { locale: $lang })}>
        <Flag class="h-4 w-4"/>
    </Dialog.Trigger>
    <Dialog.Content class="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>{$_('stats.milestone.manage', { locale: $lang })}</Dialog.Title>
            <Dialog.Description>{$_('stats.milestone.hint', { locale: $lang })}</Dialog.Description>
        </Dialog.Header>

        {#if milestones.length === 0}
            <p class="text-sm text-muted-foreground">{$_('stats.milestone.empty', { locale: $lang })}</p>
        {:else}
            <div class="flex flex-col gap-1.5">
                {#each milestones as m (m.id)}
                    <div class="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm">
                        <span class="truncate">{m.label} · {m.date}</span>
                        {#if armed === m.id}
                            <Button variant="destructive" class="h-7 px-2 text-xs shrink-0" disabled={busy}
                                    on:click={() => remove(m.id)}>
                                {#if busy}<LucideLoader class="mr-1 h-3 w-3 animate-spin"/>{/if}
                                {$_('stats.milestone.confirmDelete', { locale: $lang })}
                            </Button>
                        {:else}
                            <Button variant="ghost" class="h-7 w-7 p-0 shrink-0" disabled={busy}
                                    aria-label={$_('stats.milestone.confirmDelete', { locale: $lang })}
                                    on:click={() => armed = m.id}>
                                <LucideTrash2 class="h-4 w-4 text-muted-foreground"/>
                            </Button>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}

        <div class="flex flex-col gap-2 border-t pt-3">
            <div class="text-sm font-medium">{$_('stats.milestone.add', { locale: $lang })}</div>
            <Input class="h-9" maxlength={256} bind:value={newLabel}
                   placeholder={$_('stats.milestone.labelPlaceholder', { locale: $lang })}/>
            <Popover.Root>
                <Popover.Trigger asChild let:builder>
                    <Button variant="outline"
                            class={cn("h-9 justify-start text-left font-normal", !newDate && "text-muted-foreground")}
                            builders={[builder]}>
                        <CalendarIcon class="mr-2 h-4 w-4"/>
                        {newDate ? formatCalendarDate(newDate.toDate(getLocalTimeZone()), $lang, {dateStyle: "long"}) : $_('stats.milestone.date', { locale: $lang })}
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-auto p-0" align="start">
                    <Calendar bind:value={newDate}/>
                </Popover.Content>
            </Popover.Root>
            <Button disabled={busy || newDate == null || newLabel.trim().length === 0} on:click={create}>
                {#if busy}<LucideLoader class="mr-2 h-4 w-4 animate-spin"/>{/if}
                {$_('stats.milestone.add', { locale: $lang })}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
