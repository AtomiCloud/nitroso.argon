<script lang="ts">
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Button} from "$lib/components/ui/button";
    import {Input} from "$lib/components/ui/input";
    import {Switch} from "$lib/components/ui/switch";
    import {LucidePlusCircle, LucideTrash2} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";
    import {
        emptyTargetDraft,
        TARGET_MATCH_MODES,
        TARGET_MATCH_TYPES,
        type TargetDraft,
        type TargetMatchMode,
        type TargetMatchType,
    } from "./priority-targets";

    // One All/Any/None-over-(Role|UserId) target editor (zinc PR #37) —
    // used per rule in PrioritySection's unified policy list. draft == null
    // means the rule has NO target on zinc (matches everyone); the enable
    // switch flips between null and an editable draft. The parent builds the
    // wire shape via buildTarget(draft) on save.
    export let label: string;
    export let hint: string;
    export let draft: TargetDraft | null;

    $: enabled = draft != null;

    function toggle(next: boolean) {
        if (next === (draft != null)) return;
        draft = next ? emptyTargetDraft() : null;
    }

    function addMatch() {
        if (draft == null) return;
        draft = {...draft, matches: [...draft.matches, {matchType: "Role", value: ""}]};
    }

    const removeMatch = (i: number) => () => {
        if (draft == null) return;
        draft = {...draft, matches: draft.matches.filter((_x, j) => j !== i)};
    };

    // ToggleGroup single allows deselecting (fires with undefined) — keep the
    // last mode/type instead of ever leaving them unset
    function setMode(v: string | undefined) {
        if (draft == null || !v) return;
        draft = {...draft, matchMode: v as TargetMatchMode};
    }

    const setType = (i: number) => (v: string | undefined) => {
        if (draft == null || !v) return;
        draft = {
            ...draft,
            matches: draft.matches.map((m, j) => j === i ? {...m, matchType: v as TargetMatchType} : m),
        };
    };
</script>

<div class="flex flex-col gap-2 rounded-lg border p-3">
    <div class="flex items-center gap-3">
        <Switch checked={enabled} aria-label={label}
                onCheckedChange={(next) => toggle(next === true)}/>
        <div class="flex flex-col">
            <span class="text-sm font-medium">{label}</span>
            <span class="text-sm text-muted-foreground">{hint}</span>
        </div>
    </div>

    {#if draft != null}
        <div class="flex flex-col gap-1">
            <ToggleGroup.Root type="single" class="flex-wrap justify-start"
                              value={draft.matchMode}
                              onValueChange={setMode}>
                {#each TARGET_MATCH_MODES as m (m)}
                    <ToggleGroup.Item class="min-w-20 px-2 text-xs" value={m}
                                      aria-label={$_(`admin.costs.priority.targets.mode.${m}`, {locale: $lang})}>
                        {$_(`admin.costs.priority.targets.mode.${m}`, {locale: $lang})}
                    </ToggleGroup.Item>
                {/each}
            </ToggleGroup.Root>
            <!-- one-line explanation of the active mode -->
            <p class="text-xs text-muted-foreground">
                {$_(`admin.costs.priority.targets.modeHelp.${draft.matchMode}`, {locale: $lang})}
            </p>
        </div>

        {#if draft.matchMode !== "None"}
            {#each draft.matches as match, i}
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <ToggleGroup.Root type="single" value={match.matchType}
                                      onValueChange={setType(i)}>
                        {#each TARGET_MATCH_TYPES as t (t)}
                            <ToggleGroup.Item class="w-20 px-2 text-xs" value={t}
                                              aria-label={$_(`admin.costs.priority.targets.type.${t}`, {locale: $lang})}>
                                {$_(`admin.costs.priority.targets.type.${t}`, {locale: $lang})}
                            </ToggleGroup.Item>
                        {/each}
                    </ToggleGroup.Root>
                    <Input class="w-full sm:max-w-72"
                           bind:value={match.value}
                           placeholder={$_(`admin.costs.priority.targets.valuePlaceholder.${match.matchType}`, {locale: $lang})}
                           aria-label={$_(`admin.costs.priority.targets.type.${match.matchType}`, {locale: $lang})}/>
                    <Button variant="ghost" size="icon" class="shrink-0 text-destructive"
                            aria-label={$_('admin.costs.priority.targets.removeMatch', {locale: $lang})}
                            on:click={removeMatch(i)}>
                        <LucideTrash2 class="h-4 w-4"/>
                    </Button>
                </div>
                {#if match.value.trim() === ""}
                    <p class="text-xs text-destructive">{$_('admin.costs.priority.targets.valueRequired', {locale: $lang})}</p>
                {/if}
            {/each}
            <Button variant="outline" size="sm" class="self-start" on:click={addMatch}>
                <LucidePlusCircle class="mr-2 h-4 w-4"/>
                {$_('admin.costs.priority.targets.addMatch', {locale: $lang})}
            </Button>
            {#if draft.matches.length === 0}
                <p class="text-xs text-muted-foreground">
                    {$_(`admin.costs.priority.targets.emptyMatches.${draft.matchMode}`, {locale: $lang})}
                </p>
            {/if}
        {/if}
    {/if}
</div>
