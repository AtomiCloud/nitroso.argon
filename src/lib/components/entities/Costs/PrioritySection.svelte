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
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {LucideArrowDown, LucideArrowUp, LucideLoader, LucidePlus, LucideTrash2} from "lucide-svelte";
    import type {Selected} from "bits-ui";
    import type {PriorityAccessRes, PrioritySettingsRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatClockTime, formatDateTime} from "$lib/i18n";
    import {HALF_HOURS} from "./times";
    import PriorityTargetEditor from "./PriorityTargetEditor.svelte";
    import {buildTarget, parseTarget, targetDraftValid} from "./priority-targets";
    import {
        buildPolicies,
        emptyPolicyDraft,
        parsePolicies,
        policiesValid,
        type PolicyDraft,
    } from "./priority-policies";

    // Admin controls for the priority queue: the fee (preset chips + a small
    // numeric input, acceptable here for admin desktop only), the allow-all
    // switch, the SGT window (two time SELECTS with an "all day" switch), the
    // free/access role-targeting editors (zinc PR #37), and the per-user
    // allowlist (userIds are pasted, so free text is fine).
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

    // ---- free/access targeting (zinc PR #37) ----
    // Editor state seeded from the loaded settings; null = target unset on
    // zinc (nobody boosts free / legacy allowlist behavior).
    let freeDraft = parseTarget(settings.freeTarget);
    let accessDraft = parseTarget(settings.accessTarget);

    // ---- policy chain + slot cap (zinc PR #42) ----
    let policyDrafts: PolicyDraft[] = parsePolicies(settings.policies);
    let slotCapStr = settings.slotCap == null ? "" : String(settings.slotCap);

    function addPolicy() {
        policyDrafts = [...policyDrafts, emptyPolicyDraft()];
    }

    const removePolicy = (i: number) => () => {
        policyDrafts = policyDrafts.filter((_x, j) => j !== i);
    };

    const movePolicy = (i: number, delta: number) => () => {
        const j = i + delta;
        if (j < 0 || j >= policyDrafts.length) return;
        const next = [...policyDrafts];
        [next[i], next[j]] = [next[j], next[i]];
        policyDrafts = next;
    };

    // ToggleGroup single fires undefined on deselect — keep the last effect
    const setEffect = (i: number) => (v: string | undefined) => {
        if (!v) return;
        policyDrafts = policyDrafts.map((p, j) => j === i ? {...p, allow: v === "allow"} : p);
    };

    $: feeNum = Number(feeStr);
    $: feeValid = feeStr.trim() !== "" && Number.isFinite(feeNum) && feeNum >= 0 && feeNum <= 10000 && twoDecimals(feeNum);
    $: windowValid = allDay || (selStart?.value != null && selEnd?.value != null);
    $: targetsValid = targetDraftValid(freeDraft) && targetDraftValid(accessDraft);
    $: slotCapNum = slotCapStr.trim() === "" ? null : Number(slotCapStr);
    $: slotCapValid = slotCapNum == null
        || (Number.isInteger(slotCapNum) && slotCapNum >= 1 && slotCapNum <= 10000);
    $: policiesOk = policiesValid(policyDrafts);

    let saving = false;

    async function saveSettings() {
        if (!feeValid || !windowValid || !targetsValid || !slotCapValid || !policiesOk) return;
        saving = true;
        await toResult(() => $api.vBookingPrioritySettingsCreate("1", {
            fee: feeNum,
            allowAll,
            windowStartSgt: allDay ? null : (selStart?.value ?? null),
            windowEndSgt: allDay ? null : (selEnd?.value ?? null),
            freeTarget: buildTarget(freeDraft),
            accessTarget: buildTarget(accessDraft),
            policies: buildPolicies(policyDrafts),
            slotCap: slotCapNum,
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

            <!-- free-boost + access targeting (zinc PR #37) -->
            <PriorityTargetEditor
                    label={$_('admin.costs.priority.targets.freeLabel', {locale: $lang})}
                    hint={$_('admin.costs.priority.targets.freeHint', {locale: $lang})}
                    bind:draft={freeDraft}/>
            <PriorityTargetEditor
                    label={$_('admin.costs.priority.targets.accessLabel', {locale: $lang})}
                    hint={$_('admin.costs.priority.targets.accessHint', {locale: $lang})}
                    bind:draft={accessDraft}/>

            <!-- per-timeslot priority slot cap (zinc PR #42) -->
            <div class="flex flex-col gap-2">
                <div class="text-sm font-medium">{$_('admin.costs.priority.slotCap.label', {locale: $lang})}</div>
                <div class="flex items-center gap-2">
                    <Input class="w-28" inputmode="numeric" bind:value={slotCapStr}
                           placeholder={$_('admin.costs.priority.slotCap.placeholder', {locale: $lang})}
                           aria-label={$_('admin.costs.priority.slotCap.label', {locale: $lang})}/>
                </div>
                <p class="text-sm text-muted-foreground">{$_('admin.costs.priority.slotCap.hint', {locale: $lang})}</p>
                {#if !slotCapValid}
                    <p class="text-sm text-destructive">{$_('admin.costs.priority.slotCap.invalid', {locale: $lang})}</p>
                {/if}
            </div>

            <!-- ordered policy chain (zinc PR #42): first matching rule wins -->
            <div class="flex flex-col gap-3">
                <div class="flex flex-col">
                    <span class="text-sm font-medium">{$_('admin.costs.priority.policies.title', {locale: $lang})}</span>
                    <span class="text-sm text-muted-foreground">{$_('admin.costs.priority.policies.hint', {locale: $lang})}</span>
                </div>
                {#if policyDrafts.length === 0}
                    <p class="text-sm text-muted-foreground">{$_('admin.costs.priority.policies.empty', {locale: $lang})}</p>
                {/if}
                {#each policyDrafts as d, i (i)}
                    <div class="flex flex-col gap-3 rounded-lg border p-3">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="w-6 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                            <Input class="w-full sm:max-w-64" bind:value={d.name}
                                   placeholder={$_('admin.costs.priority.policies.namePlaceholder', {locale: $lang})}
                                   aria-label={$_('admin.costs.priority.policies.name', {locale: $lang})}/>
                            <ToggleGroup.Root type="single" value={d.allow ? "allow" : "deny"}
                                              onValueChange={setEffect(i)}>
                                <ToggleGroup.Item class="w-20 px-2 text-xs" value="allow"
                                                  aria-label={$_('admin.costs.priority.policies.allow', {locale: $lang})}>
                                    {$_('admin.costs.priority.policies.allow', {locale: $lang})}
                                </ToggleGroup.Item>
                                <ToggleGroup.Item class="w-20 px-2 text-xs" value="deny"
                                                  aria-label={$_('admin.costs.priority.policies.deny', {locale: $lang})}>
                                    {$_('admin.costs.priority.policies.deny', {locale: $lang})}
                                </ToggleGroup.Item>
                            </ToggleGroup.Root>
                            <div class="ml-auto flex items-center gap-1">
                                <Button variant="ghost" size="icon" class="h-8 w-8" disabled={i === 0}
                                        aria-label={$_('admin.costs.priority.policies.moveUp', {locale: $lang})}
                                        on:click={movePolicy(i, -1)}>
                                    <LucideArrowUp class="h-4 w-4"/>
                                </Button>
                                <Button variant="ghost" size="icon" class="h-8 w-8" disabled={i === policyDrafts.length - 1}
                                        aria-label={$_('admin.costs.priority.policies.moveDown', {locale: $lang})}
                                        on:click={movePolicy(i, 1)}>
                                    <LucideArrowDown class="h-4 w-4"/>
                                </Button>
                                <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive"
                                        aria-label={$_('admin.costs.priority.policies.remove', {locale: $lang})}
                                        on:click={removePolicy(i)}>
                                    <LucideTrash2 class="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                        <div class="flex flex-wrap items-end gap-3">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.minHours', {locale: $lang})}</span>
                                <Input class="w-24" inputmode="decimal" bind:value={d.minHours} placeholder="∞"/>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.maxHours', {locale: $lang})}</span>
                                <Input class="w-24" inputmode="decimal" bind:value={d.maxHours} placeholder="∞"/>
                            </div>
                            {#if d.allow}
                                <div class="flex flex-col gap-1">
                                    <span class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.feeOverride', {locale: $lang})}</span>
                                    <Input class="w-24" inputmode="decimal" bind:value={d.feeOverride}
                                           placeholder={String(Number(settings.fee.toFixed(2)))}/>
                                </div>
                            {/if}
                        </div>
                        <p class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.hoursHint', {locale: $lang})}</p>
                        <PriorityTargetEditor
                                label={$_('admin.costs.priority.policies.targetLabel', {locale: $lang})}
                                hint={$_('admin.costs.priority.policies.targetHint', {locale: $lang})}
                                bind:draft={d.target}/>
                    </div>
                {/each}
                {#if !policiesOk}
                    <p class="text-sm text-destructive">{$_('admin.costs.priority.policies.invalid', {locale: $lang})}</p>
                {/if}
                <Button variant="outline" size="sm" class="self-start" on:click={addPolicy}>
                    <LucidePlus class="mr-2 h-4 w-4"/>
                    {$_('admin.costs.priority.policies.add', {locale: $lang})}
                </Button>
            </div>

            <Button class="self-start" on:click={saveSettings} disabled={saving || !feeValid || !windowValid || !targetsValid || !slotCapValid || !policiesOk}>
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
