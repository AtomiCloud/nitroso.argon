<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    import {Button} from "$lib/components/ui/button";
    import {Input} from "$lib/components/ui/input";
    import {Switch} from "$lib/components/ui/switch";
    import {Separator} from "$lib/components/ui/separator";
    import {LucideLoader, LucidePlus, LucideTrash2} from "lucide-svelte";
    import type {Selected} from "bits-ui";
    import type {PriorityAccessRes, PrioritySettingsRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatClockTime, formatDateTime} from "$lib/i18n";
    import {HALF_HOURS} from "./times";

    // Admin controls for the priority queue: the fee (preset chips + a small
    // numeric input, acceptable here for admin desktop only), the allow-all
    // switch, the SGT window (two time SELECTS with an "all day" switch), and
    // the per-user allowlist (userIds are pasted, so free text is fine).
    export let settings: PrioritySettingsRes;
    export let access: PriorityAccessRes[];

    const FEE_PRESETS = [5, 10, 15, 20];

    let feeStr = String(Number(settings.fee.toFixed(2)));
    let allowAll = settings.allowAll;

    // equal or missing bounds mean "all day"; zinc wants both bounds or neither
    const initialAllDay = settings.windowStartSgt == null
        || settings.windowEndSgt == null
        || settings.windowStartSgt === settings.windowEndSgt;
    let allDay = initialAllDay;

    function toSelected(t: string | null | undefined, fallback: string): Selected<string> {
        const v = t ?? fallback;
        return {value: v, label: formatClockTime(v, $lang)};
    }

    let selStart: Selected<string> | undefined = initialAllDay
        ? undefined
        : toSelected(settings.windowStartSgt, "00:00:00");
    let selEnd: Selected<string> | undefined = initialAllDay
        ? undefined
        : toSelected(settings.windowEndSgt, "00:00:00");

    function windowOptions(current: string | undefined): string[] {
        if (current == null || current === "" || HALF_HOURS.includes(current)) return HALF_HOURS;
        return [current, ...HALF_HOURS];
    }

    const twoDecimals = (x: number) => {
        const r = x.toString().split(".");
        return r.length < 2 || r[1].length <= 2;
    };

    $: feeNum = Number(feeStr);
    $: feeValid = feeStr.trim() !== "" && Number.isFinite(feeNum) && feeNum >= 0 && feeNum <= 10000 && twoDecimals(feeNum);
    $: windowValid = allDay || (selStart?.value != null && selEnd?.value != null);

    let saving = false;

    async function saveSettings() {
        if (!feeValid || !windowValid) return;
        saving = true;
        await toResult(() => $api.vBookingPrioritySettingsCreate("1", {
            fee: feeNum,
            allowAll,
            windowStartSgt: allDay ? null : (selStart?.value ?? null),
            windowEndSgt: allDay ? null : (selEnd?.value ?? null),
        }), $_('admin.costs.priority.saveError', {locale: $lang})).match({
            ok: () => {
                toast.success($_('admin.costs.priority.saveSuccess', {locale: $lang}));
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        saving = false;
    }

    // ---- allowlist ----
    let newUserId = "";
    let adding = false;
    let removingId: string | null = null;
    let removeDialogOpen = false;
    let removeTarget: string | null = null;

    async function addAccess() {
        const id = newUserId.trim();
        if (id === "") return;
        adding = true;
        await toResult(() => $api.vBookingPriorityAccessCreate(id, "1"),
            $_('admin.costs.priority.addError', {locale: $lang})).match({
            ok: () => {
                toast.success($_('admin.costs.priority.addSuccess', {locale: $lang}));
                newUserId = "";
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        adding = false;
    }

    function confirmRemove(userId: string) {
        removeTarget = userId;
        removeDialogOpen = true;
    }

    async function removeAccess() {
        const id = removeTarget;
        if (id == null) return;
        removingId = id;
        await toResult(() => $api.vBookingPriorityAccessDelete(id, "1"),
            $_('admin.costs.priority.removeError', {locale: $lang})).match({
            ok: () => {
                toast.success($_('admin.costs.priority.removeSuccess', {locale: $lang}));
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        removingId = null;
        removeDialogOpen = false;
        removeTarget = null;
    }
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>{$_('admin.costs.priority.title', {locale: $lang})}</Card.Title>
        <Card.Description>{$_('admin.costs.priority.description', {locale: $lang})}</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-5">
            <!-- fee: preset chips + small custom input (admin desktop only) -->
            <div class="flex flex-col gap-2">
                <div class="text-sm font-medium">{$_('admin.costs.priority.feeLabel', {locale: $lang})}</div>
                <div class="flex flex-wrap items-center gap-2">
                    {#each FEE_PRESETS as p (p)}
                        <Button variant={feeValid && feeNum === p ? "default" : "outline"} size="sm"
                                on:click={() => feeStr = String(p)}>
                            {formatMoney(p, $lang)}
                        </Button>
                    {/each}
                    <Input class="w-24" inputmode="decimal" bind:value={feeStr}
                           aria-label={$_('admin.costs.priority.feeLabel', {locale: $lang})}/>
                </div>
                {#if !feeValid}
                    <p class="text-sm text-destructive">{$_('admin.costs.priority.feeInvalid', {locale: $lang})}</p>
                {/if}
            </div>

            <!-- allow all -->
            <div class="flex items-center gap-3">
                <Switch bind:checked={allowAll} aria-label={$_('admin.costs.priority.allowAll', {locale: $lang})}/>
                <div class="flex flex-col">
                    <span class="text-sm font-medium">{$_('admin.costs.priority.allowAll', {locale: $lang})}</span>
                    <span class="text-sm text-muted-foreground">{$_('admin.costs.priority.allowAllHint', {locale: $lang})}</span>
                </div>
            </div>

            <!-- SGT window -->
            <div class="flex flex-col gap-2">
                <div class="text-sm font-medium">{$_('admin.costs.priority.windowLabel', {locale: $lang})}</div>
                <div class="flex items-center gap-3">
                    <Switch bind:checked={allDay} aria-label={$_('admin.costs.priority.allDay', {locale: $lang})}/>
                    <span class="text-sm">{$_('admin.costs.priority.allDay', {locale: $lang})}</span>
                </div>
                {#if !allDay}
                    <div class="flex flex-wrap items-center gap-2">
                        <Select.Root bind:selected={selStart}>
                            <Select.Trigger class="w-36">
                                <Select.Value placeholder={$_('admin.costs.priority.windowStart', {locale: $lang})}/>
                            </Select.Trigger>
                            <Select.Content class="max-h-64 overflow-y-auto">
                                {#each windowOptions(selStart?.value) as t (t)}
                                    <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                        {formatClockTime(t, $lang)}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                        <span class="text-muted-foreground">→</span>
                        <Select.Root bind:selected={selEnd}>
                            <Select.Trigger class="w-36">
                                <Select.Value placeholder={$_('admin.costs.priority.windowEnd', {locale: $lang})}/>
                            </Select.Trigger>
                            <Select.Content class="max-h-64 overflow-y-auto">
                                {#each windowOptions(selEnd?.value) as t (t)}
                                    <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                        {formatClockTime(t, $lang)}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <p class="text-sm text-muted-foreground">{$_('admin.costs.priority.windowHint', {locale: $lang})}</p>
                {/if}
            </div>

            <Button class="self-start" on:click={saveSettings} disabled={saving || !feeValid || !windowValid}>
                {#if saving}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {/if}
                {$_('admin.costs.priority.save', {locale: $lang})}
            </Button>

            <Separator/>

            <!-- allowlist -->
            <div class="flex flex-col gap-3">
                <div class="text-sm font-medium">{$_('admin.costs.priority.allowlistTitle', {locale: $lang})}</div>
                <div class="flex flex-wrap items-center gap-2">
                    <Input class="w-full lg:max-w-80" bind:value={newUserId}
                           placeholder={$_('admin.costs.priority.userIdPlaceholder', {locale: $lang})}/>
                    <Button variant="outline" on:click={addAccess} disabled={adding || newUserId.trim() === ""}>
                        {#if adding}
                            <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                        {:else}
                            <LucidePlus class="mr-2 h-4 w-4"/>
                        {/if}
                        {$_('admin.costs.priority.add', {locale: $lang})}
                    </Button>
                </div>
                {#if access.length === 0}
                    <p class="text-sm text-muted-foreground">{$_('admin.costs.priority.allowlistEmpty', {locale: $lang})}</p>
                {:else}
                    <div class="flex flex-col gap-2">
                        {#each access as a (a.userId)}
                            <div class="flex items-center justify-between gap-3 rounded-lg border p-3">
                                <div class="flex flex-col min-w-0">
                                    <a href="/users/{a.userId}" class="font-mono text-sm truncate hover:underline">{a.userId}</a>
                                    <span class="text-xs text-muted-foreground">
                                        {$_('admin.costs.priority.addedOn', {locale: $lang, values: {datetime: formatDateTime(a.createdAt, $lang)}})}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" class="shrink-0 text-destructive"
                                        disabled={removingId === a.userId}
                                        aria-label={$_('admin.costs.priority.remove', {locale: $lang})}
                                        on:click={() => confirmRemove(a.userId ?? "")}>
                                    {#if removingId === a.userId}
                                        <LucideLoader class="h-4 w-4 animate-spin"/>
                                    {:else}
                                        <LucideTrash2 class="h-4 w-4"/>
                                    {/if}
                                </Button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </Card.Content>
</Card.Root>

<Dialog.Root bind:open={removeDialogOpen}>
    <Dialog.Content class="max-w-sm">
        <Dialog.Header>
            <Dialog.Title>{$_('admin.costs.priority.removeTitle', {locale: $lang})}</Dialog.Title>
            <Dialog.Description>
                {$_('admin.costs.priority.removeBody', {locale: $lang, values: {userId: removeTarget ?? ""}})}
            </Dialog.Description>
        </Dialog.Header>
        <Button variant="destructive" on:click={removeAccess} disabled={removingId != null}>
            {#if removingId != null}
                <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
            {/if}
            {$_('admin.costs.priority.remove', {locale: $lang})}
        </Button>
    </Dialog.Content>
</Dialog.Root>
