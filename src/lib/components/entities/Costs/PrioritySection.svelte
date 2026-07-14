<script lang="ts">
    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Button} from "$lib/components/ui/button";
    import {Input} from "$lib/components/ui/input";
    import {LucideArrowDown, LucideArrowUp, LucideLoader, LucidePlus, LucideTrash2} from "lucide-svelte";
    import type {Selected} from "bits-ui";
    import type {PrioritySettingsRes} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {_} from "svelte-i18n";
    import {lang, formatClockTime} from "$lib/i18n";
    import {HALF_HOURS} from "./times";
    import PriorityTargetEditor from "./PriorityTargetEditor.svelte";
    import {
        buildPolicies,
        emptyPolicyDraft,
        parsePolicies,
        policiesValid,
        type PolicyDraft,
    } from "./priority-policies";

    // THE priority queue admin: one ordered policy list, nothing else.
    // Each rule = who (target) + when (SGT window / hours-to-departure) +
    // allow/deny + fee (flat or % of ticket, 0 = free) + slot cap. Rules run
    // top to bottom, the first match decides, no match = deny.
    export let settings: PrioritySettingsRes;

    let policyDrafts: PolicyDraft[] = parsePolicies(settings.policies);

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

    const patch = (i: number, p: Partial<PolicyDraft>) => {
        policyDrafts = policyDrafts.map((d, j) => j === i ? {...d, ...p} : d);
    };

    // ToggleGroup single fires undefined on deselect — keep the last value
    const setEffect = (i: number) => (v: string | undefined) => {
        if (v) patch(i, {allow: v === "allow"});
    };
    const setFeeKind = (i: number) => (v: string | undefined) => {
        if (v) patch(i, {feeKind: v === "Percent" ? "Percent" : "Flat"});
    };

    // SGT window selects: '' = any time; zinc wants both bounds or neither
    function toSelected(t: string): Selected<string> | undefined {
        return t === "" ? undefined : {value: t, label: formatClockTime(t, $lang)};
    }

    function windowOptions(current: string): string[] {
        if (current === "" || HALF_HOURS.includes(current)) return HALF_HOURS;
        return [current, ...HALF_HOURS];
    }

    const setWinStart = (i: number) => (s: Selected<string> | undefined) => {
        if (s?.value != null) patch(i, {winStart: s.value});
    };
    const setWinEnd = (i: number) => (s: Selected<string> | undefined) => {
        if (s?.value != null) patch(i, {winEnd: s.value});
    };
    const clearWindow = (i: number) => () => patch(i, {winStart: "", winEnd: ""});

    $: policiesOk = policiesValid(policyDrafts);

    let saving = false;

    async function saveSettings() {
        if (!policiesOk) return;
        saving = true;
        await toResult(() => $api.vBookingPrioritySettingsCreate("1", {
            policies: buildPolicies(policyDrafts),
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
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>{$_('admin.costs.priority.title', {locale: $lang})}</Card.Title>
        <Card.Description>{$_('admin.costs.priority.description', {locale: $lang})}</Card.Description>
    </Card.Header>
    <Card.Content>
        <div class="flex flex-col gap-4">
            {#if policyDrafts.length === 0}
                <p class="text-sm text-muted-foreground">{$_('admin.costs.priority.policies.empty', {locale: $lang})}</p>
            {/if}

            {#each policyDrafts as d, i (i)}
                <div class="flex flex-col gap-3 rounded-lg border p-3">
                    <!-- rule header: order, name, effect, reorder/remove -->
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="w-6 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                        <Input class="w-full sm:max-w-64" value={d.name}
                               on:input={(e) => patch(i, {name: e.currentTarget.value})}
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

                    <!-- who -->
                    <PriorityTargetEditor
                            label={$_('admin.costs.priority.policies.targetLabel', {locale: $lang})}
                            hint={$_('admin.costs.priority.policies.targetHint', {locale: $lang})}
                            bind:draft={d.target}/>

                    <!-- when: SGT clock window + hours-to-departure -->
                    <div class="flex flex-col gap-2">
                        <span class="text-sm font-medium">{$_('admin.costs.priority.policies.whenLabel', {locale: $lang})}</span>
                        <div class="flex flex-wrap items-center gap-2">
                            <Select.Root selected={toSelected(d.winStart)} onSelectedChange={setWinStart(i)}>
                                <Select.Trigger class="w-32">
                                    <Select.Value placeholder={$_('admin.costs.priority.policies.anyTime', {locale: $lang})}/>
                                </Select.Trigger>
                                <Select.Content class="max-h-64 overflow-y-auto">
                                    {#each windowOptions(d.winStart) as t (t)}
                                        <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                            {formatClockTime(t, $lang)}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                            <span class="text-muted-foreground">→</span>
                            <Select.Root selected={toSelected(d.winEnd)} onSelectedChange={setWinEnd(i)}>
                                <Select.Trigger class="w-32">
                                    <Select.Value placeholder={$_('admin.costs.priority.policies.anyTime', {locale: $lang})}/>
                                </Select.Trigger>
                                <Select.Content class="max-h-64 overflow-y-auto">
                                    {#each windowOptions(d.winEnd) as t (t)}
                                        <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                            {formatClockTime(t, $lang)}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                            {#if d.winStart !== "" || d.winEnd !== ""}
                                <Button variant="ghost" size="sm" class="h-8 px-2 text-xs" on:click={clearWindow(i)}>
                                    {$_('admin.costs.priority.policies.anyTime', {locale: $lang})}
                                </Button>
                            {/if}
                        </div>
                        <div class="flex flex-wrap items-end gap-3">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.minHours', {locale: $lang})}</span>
                                <Input class="w-24" inputmode="decimal" value={d.minHours} placeholder="∞"
                                       on:input={(e) => patch(i, {minHours: e.currentTarget.value})}/>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.maxHours', {locale: $lang})}</span>
                                <Input class="w-24" inputmode="decimal" value={d.maxHours} placeholder="∞"
                                       on:input={(e) => patch(i, {maxHours: e.currentTarget.value})}/>
                            </div>
                        </div>
                        <p class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.hoursHint', {locale: $lang})}</p>
                    </div>

                    {#if d.allow}
                        <!-- fee + slot cap (allow rules only) -->
                        <div class="flex flex-wrap items-end gap-3">
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.fee', {locale: $lang})}</span>
                                <div class="flex items-center gap-2">
                                    <ToggleGroup.Root type="single" value={d.feeKind} onValueChange={setFeeKind(i)}>
                                        <ToggleGroup.Item class="w-16 px-2 text-xs" value="Flat"
                                                          aria-label={$_('admin.costs.priority.policies.feeFlat', {locale: $lang})}>
                                            {$_('admin.costs.priority.policies.feeFlat', {locale: $lang})}
                                        </ToggleGroup.Item>
                                        <ToggleGroup.Item class="w-16 px-2 text-xs" value="Percent"
                                                          aria-label={$_('admin.costs.priority.policies.feePercent', {locale: $lang})}>
                                            {$_('admin.costs.priority.policies.feePercent', {locale: $lang})}
                                        </ToggleGroup.Item>
                                    </ToggleGroup.Root>
                                    <Input class="w-24" inputmode="decimal" value={d.feeValue}
                                           on:input={(e) => patch(i, {feeValue: e.currentTarget.value})}
                                           aria-label={$_('admin.costs.priority.policies.fee', {locale: $lang})}/>
                                    <span class="text-xs text-muted-foreground">
                                        {d.feeKind === "Percent"
                                            ? $_('admin.costs.priority.policies.feePercentHint', {locale: $lang})
                                            : "SGD"}
                                    </span>
                                </div>
                                <p class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.feeFreeHint', {locale: $lang})}</p>
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.slotCap', {locale: $lang})}</span>
                                <Input class="w-28" inputmode="numeric" value={d.slotCap}
                                       placeholder={$_('admin.costs.priority.policies.slotCapUnlimited', {locale: $lang})}
                                       on:input={(e) => patch(i, {slotCap: e.currentTarget.value})}/>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}

            {#if !policiesOk}
                <p class="text-sm text-destructive">{$_('admin.costs.priority.policies.invalid', {locale: $lang})}</p>
            {/if}

            <div class="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" on:click={addPolicy}>
                    <LucidePlus class="mr-2 h-4 w-4"/>
                    {$_('admin.costs.priority.policies.add', {locale: $lang})}
                </Button>
                <Button size="sm" on:click={saveSettings} disabled={saving || !policiesOk}>
                    {#if saving}
                        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                    {/if}
                    {$_('admin.costs.priority.save', {locale: $lang})}
                </Button>
            </div>
            <p class="text-xs text-muted-foreground">{$_('admin.costs.priority.policies.hint', {locale: $lang})}</p>
        </div>
    </Card.Content>
</Card.Root>
