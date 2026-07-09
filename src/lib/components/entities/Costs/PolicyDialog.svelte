<script lang="ts">
    //@ts-ignore
    import * as Dialog from "$lib/components/ui/dialog";
    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    //@ts-ignore
    import * as ToggleGroup from "$lib/components/ui/toggle-group";
    import {Button} from "$lib/components/ui/button";
    import {Input} from "$lib/components/ui/input";
    import {Label} from "$lib/components/ui/label";
    import {Switch} from "$lib/components/ui/switch";
    import {Calendar} from "$lib/components/ui/calendar";
    import {CalendarIcon, LucideLoader} from "lucide-svelte";
    import type {Selected} from "bits-ui";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import type {CostPolicyPrincipalRes, CostPolicyReq} from "$lib/api/core/data-contracts";
    import {api} from "../../../../store";
    import {toResult} from "$lib/utility";
    import {toast} from "svelte-sonner";
    import {cn} from "$lib/utils";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatClockTime} from "$lib/i18n";
    import {DAYS_OF_WEEK, HALF_HOURS, LEAD_TIME_HOURS, withValue} from "./times";

    // Add/edit dialog for one cost policy. Everything except the name and the
    // adjustment amount is a tap control (calendar, select, toggle) — no free
    // typing (owner mandate). `policy == null` means create; otherwise the
    // form is prefilled and Save PUTs a full replacement.
    export let open = false;
    export let policy: CostPolicyPrincipalRes | null = null;
    // schedule times per direction, for the departure-time matcher select
    export let timesJToW: string[] = [];
    export let timesWToJ: string[] = [];
    export let onSaved: () => void;

    // ---- form state ----
    let name = "";
    let enabled = true;
    let sign = "+"; // "+" surcharge | "-" discount
    let amountStr = "";
    let adjKind = "flat"; // "flat" | "percent"
    // never leave the toggles deselected
    $: if (!sign) sign = "+";
    $: if (!adjKind) adjKind = "flat";

    // optional matchers, each behind its own switch
    let useDate = false;
    let matchDate: DateValue | undefined = undefined;
    let useTime = false;
    let selTime: Selected<string> | undefined = undefined;
    let useDay = false;
    let selDay: Selected<string> | undefined = undefined;
    let useDirection = false;
    let selDirection: Selected<string> | undefined = undefined;
    let useLead = false;
    let selLead: Selected<string> | undefined = undefined;

    // optional schedule window (effective / expiry), calendar + time select
    let useEffective = false;
    let effectiveDate: DateValue | undefined = undefined;
    let selEffectiveTime: Selected<string> | undefined = undefined;
    let useExpiry = false;
    let expiryDate: DateValue | undefined = undefined;
    let selExpiryTime: Selected<string> | undefined = undefined;

    let submitting = false;
    let errorKeys: string[] = [];

    // ---- option lists ----
    // departure-time options follow the direction matcher when set; schedule
    // slots first, falling back to common half-hour times when zinc has none
    $: baseTimes = selDirection?.value === "JToW"
        ? timesJToW
        : selDirection?.value === "WToJ"
            ? timesWToJ
            : [...new Set([...timesJToW, ...timesWToJ])].sort();
    $: timeOptions = withValue(baseTimes.length > 0 ? baseTimes : HALF_HOURS, policy?.matchTime);

    function directionLabel(v: string): string {
        return $_(v === "WToJ" ? 'bookings.list.woodlandsToJb' : 'bookings.list.jbToWoodlands', {locale: $lang});
    }

    // ---- seed the form on every open ----
    function toCalDate(zinc: string | null | undefined): DateValue | undefined {
        if (zinc == null || zinc === "") return undefined;
        const [d, m, y] = zinc.split("-").map(x => parseInt(x, 10));
        if (!y || !m || !d) return undefined;
        return new CalendarDate(y, m, d);
    }

    function isoToParts(iso: string | null | undefined): { date: DateValue; time: string } | undefined {
        if (iso == null || iso === "") return undefined;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return undefined;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return {
            date: new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
            time: `${hh}:${mm}:00`,
        };
    }

    function seed() {
        const p = policy;
        name = p?.name ?? "";
        enabled = p?.enabled ?? true;
        sign = p != null && p.amount < 0 ? "-" : "+";
        amountStr = p != null ? String(Number(Math.abs(p.amount).toFixed(2))) : "";
        adjKind = p?.isPercentage ? "percent" : "flat";

        matchDate = toCalDate(p?.matchDate);
        useDate = matchDate != null;
        selTime = p?.matchTime ? {value: p.matchTime, label: formatClockTime(p.matchTime, $lang)} : undefined;
        useTime = selTime != null;
        selDay = p?.matchDayOfWeek
            ? {value: p.matchDayOfWeek, label: $_(`stats.days.${p.matchDayOfWeek.toLowerCase()}`, {locale: $lang})}
            : undefined;
        useDay = selDay != null;
        selDirection = p?.matchDirection
            ? {value: p.matchDirection, label: directionLabel(p.matchDirection)}
            : undefined;
        useDirection = selDirection != null;
        selLead = p?.leadTimeUnderHours != null
            ? {value: String(p.leadTimeUnderHours), label: $_('admin.costs.policies.leadUnder', {locale: $lang, values: {hours: p.leadTimeUnderHours}})}
            : undefined;
        useLead = selLead != null;

        const eff = isoToParts(p?.effectiveAt);
        effectiveDate = eff?.date;
        selEffectiveTime = eff ? {value: eff.time, label: formatClockTime(eff.time, $lang)} : undefined;
        useEffective = eff != null;
        const exp = isoToParts(p?.expiresAt);
        expiryDate = exp?.date;
        selExpiryTime = exp ? {value: exp.time, label: formatClockTime(exp.time, $lang)} : undefined;
        useExpiry = exp != null;

        errorKeys = [];
    }

    let wasOpen = false;
    $: if (open !== wasOpen) {
        wasOpen = open;
        if (open) seed();
    }

    // ---- validation + submit ----
    const twoDecimals = (x: number) => {
        const r = x.toString().split(".");
        return r.length < 2 || r[1].length <= 2;
    };

    function validate(): string[] {
        const errs: string[] = [];
        if (name.trim().length === 0) errs.push("nameRequired");
        const n = Number(amountStr);
        if (amountStr.trim() === "" || !Number.isFinite(n) || n <= 0 || !twoDecimals(n)) errs.push("amountInvalid");
        else if (adjKind === "percent" && n > 100) errs.push("percentRange");
        if (useDate && matchDate == null) errs.push("dateMissing");
        if (useTime && selTime?.value == null) errs.push("timeMissing");
        if (useDay && selDay?.value == null) errs.push("dayMissing");
        if (useDirection && selDirection?.value == null) errs.push("directionMissing");
        if (useLead && selLead?.value == null) errs.push("leadMissing");
        if (useEffective && effectiveDate == null) errs.push("effectiveMissing");
        if (useExpiry && expiryDate == null) errs.push("expiryMissing");
        const effIso = useEffective && effectiveDate != null ? toIso(effectiveDate, selEffectiveTime?.value) : null;
        const expIso = useExpiry && expiryDate != null ? toIso(expiryDate, selExpiryTime?.value) : null;
        if (effIso != null && expIso != null && new Date(effIso).getTime() >= new Date(expIso).getTime()) {
            errs.push("windowOrder");
        }
        return errs;
    }

    function toZincDate(d: DateValue): string {
        return `${String(d.day).padStart(2, "0")}-${String(d.month).padStart(2, "0")}-${d.year}`;
    }

    // calendar day + HH:mm:ss in the admin's local timezone → UTC instant
    function toIso(d: DateValue, time: string | undefined): string {
        const [h, m] = (time ?? "00:00:00").split(":").map(x => parseInt(x, 10));
        const local = d.toDate(getLocalTimeZone());
        local.setHours(h || 0, m || 0, 0, 0);
        return local.toISOString();
    }

    function buildReq(): CostPolicyReq {
        const magnitude = Number(amountStr);
        return {
            name: name.trim(),
            enabled,
            matchDate: useDate && matchDate != null ? toZincDate(matchDate) : null,
            matchTime: useTime ? (selTime?.value ?? null) : null,
            matchDayOfWeek: useDay ? (selDay?.value ?? null) : null,
            matchDirection: useDirection ? (selDirection?.value ?? null) : null,
            leadTimeUnderHours: useLead && selLead?.value ? parseInt(selLead.value, 10) : null,
            amount: (sign === "-" ? -1 : 1) * magnitude,
            isPercentage: adjKind === "percent",
            effectiveAt: useEffective && effectiveDate != null ? toIso(effectiveDate, selEffectiveTime?.value) : null,
            expiresAt: useExpiry && expiryDate != null ? toIso(expiryDate, selExpiryTime?.value) : null,
        };
    }

    async function submit() {
        errorKeys = validate();
        if (errorKeys.length > 0) return;
        submitting = true;
        const req = buildReq();
        const call = policy == null
            ? () => $api.vCostPoliciesCreate("1", req)
            : () => $api.vCostPoliciesUpdate(policy?.id ?? "", "1", req);
        await toResult(call, $_('admin.costs.policies.saveError', {locale: $lang})).match({
            ok: () => {
                toast.success($_('admin.costs.policies.saveSuccess', {locale: $lang}));
                open = false;
                onSaved();
            },
            err: (e) => {
                console.error(e);
                toast.error(e.detail ?? e.type);
            }
        });
        submitting = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="max-w-lg max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>
                {policy == null
                    ? $_('admin.costs.policies.addTitle', {locale: $lang})
                    : $_('admin.costs.policies.editTitle', {locale: $lang})}
            </Dialog.Title>
            <Dialog.Description>
                {$_('admin.costs.policies.dialogIntro', {locale: $lang})}
            </Dialog.Description>
        </Dialog.Header>
        <div class="flex flex-col gap-5">
            <!-- name -->
            <div class="flex flex-col gap-2">
                <Label for="policy-name">{$_('admin.costs.policies.nameLabel', {locale: $lang})}</Label>
                <Input id="policy-name" bind:value={name}
                       placeholder={$_('admin.costs.policies.namePlaceholder', {locale: $lang})}/>
            </div>

            <!-- adjustment: sign toggle + amount + flat/% toggle -->
            <div class="flex flex-col gap-2">
                <Label for="policy-amount">{$_('admin.costs.policies.adjustmentLabel', {locale: $lang})}</Label>
                <div class="flex flex-wrap items-center gap-2">
                    <ToggleGroup.Root type="single" bind:value={sign}>
                        <ToggleGroup.Item value="+" aria-label={$_('admin.costs.policies.surcharge', {locale: $lang})}>
                            +
                        </ToggleGroup.Item>
                        <ToggleGroup.Item value="-" aria-label={$_('admin.costs.policies.discount', {locale: $lang})}>
                            −
                        </ToggleGroup.Item>
                    </ToggleGroup.Root>
                    <Input id="policy-amount" class="w-28" inputmode="decimal" bind:value={amountStr}
                           placeholder={$_('admin.costs.policies.amountPlaceholder', {locale: $lang})}/>
                    <ToggleGroup.Root type="single" bind:value={adjKind}>
                        <ToggleGroup.Item value="flat" aria-label={$_('admin.costs.policies.flat', {locale: $lang})}>
                            S$
                        </ToggleGroup.Item>
                        <ToggleGroup.Item value="percent" aria-label={$_('admin.costs.policies.percent', {locale: $lang})}>
                            %
                        </ToggleGroup.Item>
                    </ToggleGroup.Root>
                </div>
                <p class="text-sm text-muted-foreground">
                    {sign === "-"
                        ? $_('admin.costs.policies.discountHint', {locale: $lang})
                        : $_('admin.costs.policies.surchargeHint', {locale: $lang})}
                </p>
            </div>

            <!-- optional matchers -->
            <div class="flex flex-col gap-3">
                <div class="text-sm font-medium">{$_('admin.costs.policies.matchersLabel', {locale: $lang})}</div>
                <p class="text-sm text-muted-foreground">{$_('admin.costs.policies.matchersHint', {locale: $lang})}</p>

                <div class="flex items-center gap-3">
                    <Switch bind:checked={useDate} aria-label={$_('admin.costs.policies.matchDate', {locale: $lang})}/>
                    <span class="text-sm w-28 shrink-0">{$_('admin.costs.policies.matchDate', {locale: $lang})}</span>
                    {#if useDate}
                        <Popover.Root>
                            <Popover.Trigger asChild let:builder>
                                <Button variant="outline"
                                        class={cn("flex-1 justify-start text-left font-normal", !matchDate && "text-muted-foreground")}
                                        builders={[builder]}>
                                    <CalendarIcon class="mr-2 h-4 w-4"/>
                                    {matchDate
                                        ? formatCalendarDate(matchDate.toDate(getLocalTimeZone()), $lang)
                                        : $_('admin.costs.policies.pickDate', {locale: $lang})}
                                </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-auto p-0" align="start">
                                <Calendar bind:value={matchDate}/>
                            </Popover.Content>
                        </Popover.Root>
                    {/if}
                </div>

                <div class="flex items-center gap-3">
                    <Switch bind:checked={useTime} aria-label={$_('admin.costs.policies.matchTime', {locale: $lang})}/>
                    <span class="text-sm w-28 shrink-0">{$_('admin.costs.policies.matchTime', {locale: $lang})}</span>
                    {#if useTime}
                        <Select.Root bind:selected={selTime}>
                            <Select.Trigger class="flex-1">
                                <Select.Value placeholder={$_('admin.costs.policies.pickTime', {locale: $lang})}/>
                            </Select.Trigger>
                            <Select.Content class="max-h-64 overflow-y-auto">
                                {#each timeOptions as t (t)}
                                    <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                        {formatClockTime(t, $lang)}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    {/if}
                </div>

                <div class="flex items-center gap-3">
                    <Switch bind:checked={useDay} aria-label={$_('admin.costs.policies.matchDay', {locale: $lang})}/>
                    <span class="text-sm w-28 shrink-0">{$_('admin.costs.policies.matchDay', {locale: $lang})}</span>
                    {#if useDay}
                        <Select.Root bind:selected={selDay}>
                            <Select.Trigger class="flex-1">
                                <Select.Value placeholder={$_('admin.costs.policies.pickDay', {locale: $lang})}/>
                            </Select.Trigger>
                            <Select.Content>
                                {#each DAYS_OF_WEEK as d (d)}
                                    <Select.Item value={d} label={$_(`stats.days.${d.toLowerCase()}`, {locale: $lang})}>
                                        {$_(`stats.days.${d.toLowerCase()}`, {locale: $lang})}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    {/if}
                </div>

                <div class="flex items-center gap-3">
                    <Switch bind:checked={useDirection}
                            aria-label={$_('admin.costs.policies.matchDirection', {locale: $lang})}/>
                    <span class="text-sm w-28 shrink-0">{$_('admin.costs.policies.matchDirection', {locale: $lang})}</span>
                    {#if useDirection}
                        <Select.Root bind:selected={selDirection}>
                            <Select.Trigger class="flex-1">
                                <Select.Value placeholder={$_('admin.costs.policies.pickDirection', {locale: $lang})}/>
                            </Select.Trigger>
                            <Select.Content>
                                {#each ["JToW", "WToJ"] as d (d)}
                                    <Select.Item value={d} label={directionLabel(d)}>
                                        {directionLabel(d)}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    {/if}
                </div>

                <div class="flex items-center gap-3">
                    <Switch bind:checked={useLead} aria-label={$_('admin.costs.policies.matchLead', {locale: $lang})}/>
                    <span class="text-sm w-28 shrink-0">{$_('admin.costs.policies.matchLead', {locale: $lang})}</span>
                    {#if useLead}
                        <Select.Root bind:selected={selLead}>
                            <Select.Trigger class="flex-1">
                                <Select.Value placeholder={$_('admin.costs.policies.pickLead', {locale: $lang})}/>
                            </Select.Trigger>
                            <Select.Content>
                                {#each LEAD_TIME_HOURS as h (h)}
                                    <Select.Item value={String(h)}
                                                 label={$_('admin.costs.policies.leadUnder', {locale: $lang, values: {hours: h}})}>
                                        {$_('admin.costs.policies.leadUnder', {locale: $lang, values: {hours: h}})}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    {/if}
                </div>
            </div>

            <!-- optional schedule window -->
            <div class="flex flex-col gap-3">
                <div class="text-sm font-medium">{$_('admin.costs.policies.windowLabel', {locale: $lang})}</div>

                <div class="flex items-center gap-3 flex-wrap">
                    <Switch bind:checked={useEffective}
                            aria-label={$_('admin.costs.policies.effectiveFrom', {locale: $lang})}/>
                    <span class="text-sm w-28 shrink-0">{$_('admin.costs.policies.effectiveFrom', {locale: $lang})}</span>
                    {#if useEffective}
                        <Popover.Root>
                            <Popover.Trigger asChild let:builder>
                                <Button variant="outline"
                                        class={cn("justify-start text-left font-normal", !effectiveDate && "text-muted-foreground")}
                                        builders={[builder]}>
                                    <CalendarIcon class="mr-2 h-4 w-4"/>
                                    {effectiveDate
                                        ? formatCalendarDate(effectiveDate.toDate(getLocalTimeZone()), $lang)
                                        : $_('admin.costs.policies.pickDate', {locale: $lang})}
                                </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-auto p-0" align="start">
                                <Calendar bind:value={effectiveDate}/>
                            </Popover.Content>
                        </Popover.Root>
                        <Select.Root bind:selected={selEffectiveTime}>
                            <Select.Trigger class="w-32">
                                <Select.Value placeholder={formatClockTime("00:00:00", $lang)}/>
                            </Select.Trigger>
                            <Select.Content class="max-h-64 overflow-y-auto">
                                {#each withValue(HALF_HOURS, selEffectiveTime?.value) as t (t)}
                                    <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                        {formatClockTime(t, $lang)}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    {/if}
                </div>

                <div class="flex items-center gap-3 flex-wrap">
                    <Switch bind:checked={useExpiry}
                            aria-label={$_('admin.costs.policies.expiresAt', {locale: $lang})}/>
                    <span class="text-sm w-28 shrink-0">{$_('admin.costs.policies.expiresAt', {locale: $lang})}</span>
                    {#if useExpiry}
                        <Popover.Root>
                            <Popover.Trigger asChild let:builder>
                                <Button variant="outline"
                                        class={cn("justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}
                                        builders={[builder]}>
                                    <CalendarIcon class="mr-2 h-4 w-4"/>
                                    {expiryDate
                                        ? formatCalendarDate(expiryDate.toDate(getLocalTimeZone()), $lang)
                                        : $_('admin.costs.policies.pickDate', {locale: $lang})}
                                </Button>
                            </Popover.Trigger>
                            <Popover.Content class="w-auto p-0" align="start">
                                <Calendar bind:value={expiryDate}/>
                            </Popover.Content>
                        </Popover.Root>
                        <Select.Root bind:selected={selExpiryTime}>
                            <Select.Trigger class="w-32">
                                <Select.Value placeholder={formatClockTime("00:00:00", $lang)}/>
                            </Select.Trigger>
                            <Select.Content class="max-h-64 overflow-y-auto">
                                {#each withValue(HALF_HOURS, selExpiryTime?.value) as t (t)}
                                    <Select.Item value={t} label={formatClockTime(t, $lang)}>
                                        {formatClockTime(t, $lang)}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    {/if}
                </div>
            </div>

            <!-- enabled -->
            <div class="flex items-center gap-3">
                <Switch bind:checked={enabled} aria-label={$_('admin.costs.policies.enabledLabel', {locale: $lang})}/>
                <span class="text-sm">{$_('admin.costs.policies.enabledLabel', {locale: $lang})}</span>
            </div>

            {#if errorKeys.length > 0}
                <ul class="flex flex-col gap-1">
                    {#each errorKeys as k (k)}
                        <li class="text-sm text-destructive">
                            {$_(`admin.costs.policies.errors.${k}`, {locale: $lang})}
                        </li>
                    {/each}
                </ul>
            {/if}

            <Button class="my-2" on:click={submit} disabled={submitting}>
                {#if submitting}
                    <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                {/if}
                {$_('admin.costs.policies.save', {locale: $lang})}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
