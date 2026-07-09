<script lang="ts">
    import Page from "$lib/components/complex/page.svelte";
    import type {CostPolicyPrincipalRes} from "$lib/api/core/data-contracts";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Res} from "$lib/core/result";
    import {api, problem} from "../../store";
    import Loader from "$lib/components/complex/loader.svelte";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Table from "$lib/components/ui/table";
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";

    import type {PageData} from "./$types";
    import type {CostsPageOk} from "./+page";
    import {Input} from "$lib/components/ui/input";
    import {Button} from "$lib/components/ui/button";
    import {Switch} from "$lib/components/ui/switch";
    import {Badge} from "$lib/components/ui/badge";
    import {LucideLoader, LucidePencil, LucidePlus, LucideTrash2} from "lucide-svelte";
    import PolicyDialog from "$lib/components/entities/Costs/PolicyDialog.svelte";
    import CostSummaryPreview from "$lib/components/entities/Costs/CostSummaryPreview.svelte";
    import PrioritySection from "$lib/components/entities/Costs/PrioritySection.svelte";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {invalidateAll} from "$app/navigation";
    import {parse} from "date-fns";
    import {_} from "svelte-i18n";
    import {lang, formatMoney, formatNumber, formatDateTime, formatCalendarDate, formatClockTime} from "$lib/i18n";

    export let data: PageData;

    $: pageData = (Res.fromSerial<CostsPageOk, ProblemDetails[]>(data.result)
        .match({
            ok: (a: CostsPageOk): CostsPageOk => {
                problem.set(null)
                return a;
            },
            err: (e) => {
                console.error(e);
                problem.set(e[0]);
                return null as never;
            }
        }) satisfies Promise<CostsPageOk>)

    // ---- base cost (unchanged behaviour) ----
    function isValid(s: string): string {
        if (s.length === 0) return "required";
        const n = Number(s);
        if (isNaN(n)) return "invalidNumber";
        if (n < 0) return "mustBePositive";
        return "valid";
    }

    let value: string = "";

    $: valid = isValid(value) === "valid";

    function validationMessage(s: string): string {
        const code = isValid(s);
        if (code === "valid") return "";
        return $_(`errors.${code}`, {locale: $lang});
    }

    async function updateCost() {
        await toResult(
            () => $api.vCostCreate("1", {cost: Number(value)}),
            "Cost failed to update")
            .match({
                err: (e) => {
                    console.error(e);
                    toast.error(e.detail ?? e.type);
                },
                ok: () => {
                    toast.success($_("admin.costs.costUpdated", {locale: $lang}));
                    invalidateAll();
                },
            })
    }

    // ---- policy list ----
    let policyDialogOpen = false;
    let editingPolicy: CostPolicyPrincipalRes | null = null;

    function openAddPolicy() {
        editingPolicy = null;
        policyDialogOpen = true;
    }

    function openEditPolicy(p: CostPolicyPrincipalRes) {
        editingPolicy = p;
        policyDialogOpen = true;
    }

    function adjustmentText(p: CostPolicyPrincipalRes): string {
        const sign = p.amount >= 0 ? "+" : "−";
        const magnitude = Math.abs(p.amount);
        return p.isPercentage
            ? `${sign}${formatNumber(magnitude, $lang)}%`
            : `${sign}${formatMoney(magnitude, $lang)}`;
    }

    function directionLabel(v: string): string {
        return $_(v === "WToJ" ? 'bookings.list.woodlandsToJb' : 'bookings.list.jbToWoodlands', {locale: $lang});
    }

    // compact render of the non-null match dimensions
    function matchesText(p: CostPolicyPrincipalRes): string {
        const parts: string[] = [];
        if (p.matchDate) parts.push(formatCalendarDate(parse(p.matchDate, "dd-MM-yyyy", new Date()), $lang));
        if (p.matchTime) parts.push(formatClockTime(p.matchTime, $lang));
        if (p.matchDayOfWeek) parts.push($_(`stats.days.${p.matchDayOfWeek.toLowerCase()}`, {locale: $lang}));
        if (p.matchDirection) parts.push(directionLabel(p.matchDirection));
        if (p.leadTimeUnderHours != null) {
            parts.push($_('admin.costs.policies.leadUnder', {locale: $lang, values: {hours: p.leadTimeUnderHours}}));
        }
        return parts.length === 0 ? $_('admin.costs.policies.matchesAll', {locale: $lang}) : parts.join(" · ");
    }

    function windowText(p: CostPolicyPrincipalRes): string {
        if (p.effectiveAt == null && p.expiresAt == null) return $_('admin.costs.policies.always', {locale: $lang});
        const from = p.effectiveAt == null ? "" : formatDateTime(p.effectiveAt, $lang);
        const to = p.expiresAt == null ? "" : formatDateTime(p.expiresAt, $lang);
        if (from !== "" && to !== "") return `${from} → ${to}`;
        if (from !== "") return $_('admin.costs.policies.fromDate', {locale: $lang, values: {date: from}});
        return $_('admin.costs.policies.untilDate', {locale: $lang, values: {date: to}});
    }

    // enable/disable via full-replace PUT (zinc has no PATCH)
    let togglingId: string | null = null;

    async function toggleEnabled(p: CostPolicyPrincipalRes, next: boolean) {
        if (next === p.enabled || togglingId != null) return;
        togglingId = p.id;
        await toResult(() => $api.vCostPoliciesUpdate(p.id, "1", {
            name: p.name,
            enabled: next,
            matchDate: p.matchDate ?? null,
            matchTime: p.matchTime ?? null,
            matchDayOfWeek: p.matchDayOfWeek ?? null,
            matchDirection: p.matchDirection ?? null,
            leadTimeUnderHours: p.leadTimeUnderHours ?? null,
            amount: p.amount,
            isPercentage: p.isPercentage,
            effectiveAt: p.effectiveAt ?? null,
            expiresAt: p.expiresAt ?? null,
        }), $_('admin.costs.policies.saveError', {locale: $lang})).match({
            ok: () => {
                toast.success($_(next ? 'admin.costs.policies.enabledToast' : 'admin.costs.policies.disabledToast', {locale: $lang}));
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
                invalidateAll();
            }
        });
        togglingId = null;
    }

    // delete behind a confirm dialog
    let deleteDialogOpen = false;
    let deleteTarget: CostPolicyPrincipalRes | null = null;
    let deleting = false;

    function confirmDelete(p: CostPolicyPrincipalRes) {
        deleteTarget = p;
        deleteDialogOpen = true;
    }

    async function deletePolicy() {
        const p = deleteTarget;
        if (p == null) return;
        deleting = true;
        await toResult(() => $api.vCostPoliciesDelete(p.id, "1"),
            $_('admin.costs.policies.deleteError', {locale: $lang})).match({
            ok: () => {
                toast.success($_('admin.costs.policies.deleteSuccess', {locale: $lang}));
                invalidateAll();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        deleting = false;
        deleteDialogOpen = false;
        deleteTarget = null;
    }
</script>

<Page notFoundMessage={$_("admin.costs.notFound", {locale: $lang})}>
    <div class="flex flex-col">
        <div class="flex flex-col gap-4 w-11/12 max-w-[1200px] mx-auto my-12">

            {#await pageData}
                <Loader/>
            {:then [cs, policies, prioritySettings, priorityAccess, timingsJToW, timingsWToJ]}
                <div class="flex flex-wrap justify-between gap-4">
                    <div class="text-2xl">{$_("admin.costs.currentPrice", {locale: $lang, values: {price: formatMoney(cs[0].cost, $lang)}})}</div>
                    <div class="grid w-full max-w-sm items-center gap-1.5">
                        <Input inputmode="numeric" placeholder={$_("admin.costs.newCostPlaceholder", {locale: $lang})} bind:value/>
                        <p class="text-sm text-destructive {valid ? 'opacity-0' : 'opacity-100'}">{validationMessage(value)}</p>
                    </div>
                    <Button class="w-full max-w-sm" on:click={updateCost}>{$_("admin.costs.updateCost", {locale: $lang})}</Button>
                </div>

                <!-- cost policies -->
                <Card.Root class="my-4">
                    <Card.Header>
                        <div class="flex flex-wrap justify-between items-start gap-4">
                            <div class="flex flex-col gap-1">
                                <Card.Title>{$_('admin.costs.policies.title', {locale: $lang})}</Card.Title>
                                <Card.Description>{$_('admin.costs.policies.description', {locale: $lang})}</Card.Description>
                            </div>
                            <Button variant="outline" on:click={openAddPolicy}>
                                <LucidePlus class="mr-2 h-4 w-4"/>
                                {$_('admin.costs.policies.addTrigger', {locale: $lang})}
                            </Button>
                        </div>
                    </Card.Header>
                    <Card.Content>
                        {#if policies.length === 0}
                            <p class="text-sm text-muted-foreground">{$_('admin.costs.policies.empty', {locale: $lang})}</p>
                        {:else}
                            <div class="overflow-x-auto">
                                <Table.Root>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.Head>{$_('admin.costs.policies.colName', {locale: $lang})}</Table.Head>
                                            <Table.Head>{$_('admin.costs.policies.colMatches', {locale: $lang})}</Table.Head>
                                            <Table.Head class="text-right">{$_('admin.costs.policies.colAdjustment', {locale: $lang})}</Table.Head>
                                            <Table.Head>{$_('admin.costs.policies.colWindow', {locale: $lang})}</Table.Head>
                                            <Table.Head>{$_('admin.costs.policies.colEnabled', {locale: $lang})}</Table.Head>
                                            <Table.Head class="text-right">{$_('admin.costs.policies.colActions', {locale: $lang})}</Table.Head>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {#each policies as p (p.id)}
                                            <Table.Row class={p.enabled ? "" : "opacity-60"}>
                                                <Table.Cell class="font-medium whitespace-nowrap">{p.name}</Table.Cell>
                                                <Table.Cell class="whitespace-nowrap">{matchesText(p)}</Table.Cell>
                                                <Table.Cell class="text-right whitespace-nowrap">
                                                    <Badge variant="outline"
                                                           class={p.amount >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                                                        {adjustmentText(p)}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell class="whitespace-nowrap text-sm text-muted-foreground">{windowText(p)}</Table.Cell>
                                                <Table.Cell>
                                                    <Switch checked={p.enabled}
                                                            disabled={togglingId != null}
                                                            aria-label={$_('admin.costs.policies.colEnabled', {locale: $lang})}
                                                            onCheckedChange={(next) => toggleEnabled(p, next === true)}/>
                                                </Table.Cell>
                                                <Table.Cell class="text-right whitespace-nowrap">
                                                    <Button variant="ghost" size="icon"
                                                            aria-label={$_('admin.costs.policies.edit', {locale: $lang})}
                                                            on:click={() => openEditPolicy(p)}>
                                                        <LucidePencil class="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" class="text-destructive"
                                                            aria-label={$_('admin.costs.policies.delete', {locale: $lang})}
                                                            on:click={() => confirmDelete(p)}>
                                                        <LucideTrash2 class="h-4 w-4"/>
                                                    </Button>
                                                </Table.Cell>
                                            </Table.Row>
                                        {/each}
                                    </Table.Body>
                                </Table.Root>
                            </div>
                        {/if}
                    </Card.Content>
                </Card.Root>

                <!-- live pricing preview -->
                <CostSummaryPreview
                        timesJToW={timingsJToW.principal.timings ?? []}
                        timesWToJ={timingsWToJ.principal.timings ?? []}/>

                <!-- priority queue settings + allowlist -->
                <PrioritySection settings={prioritySettings} access={priorityAccess}/>

                <!-- base-cost history -->
                <div class="flex flex-col gap-4 my-4">
                    {#each cs as c}
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>{formatMoney(c.cost, $lang)}</Card.Title>
                                <div class="flex justify-between py-2">
                                    <Card.Description>{formatDateTime(c.createdAt, $lang)}</Card.Description>
                                </div>
                            </Card.Header>
                        </Card.Root>
                    {/each}
                </div>

                <PolicyDialog bind:open={policyDialogOpen}
                              policy={editingPolicy}
                              timesJToW={timingsJToW.principal.timings ?? []}
                              timesWToJ={timingsWToJ.principal.timings ?? []}
                              onSaved={() => invalidateAll()}/>

                <Dialog.Root bind:open={deleteDialogOpen}>
                    <Dialog.Content class="max-w-sm">
                        <Dialog.Header>
                            <Dialog.Title>{$_('admin.costs.policies.deleteTitle', {locale: $lang})}</Dialog.Title>
                            <Dialog.Description>
                                {$_('admin.costs.policies.deleteBody', {locale: $lang, values: {name: deleteTarget?.name ?? ""}})}
                            </Dialog.Description>
                        </Dialog.Header>
                        <Button variant="destructive" on:click={deletePolicy} disabled={deleting}>
                            {#if deleting}
                                <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                            {/if}
                            {$_('admin.costs.policies.delete', {locale: $lang})}
                        </Button>
                    </Dialog.Content>
                </Dialog.Root>
            {/await}
        </div>
    </div>
</Page>
