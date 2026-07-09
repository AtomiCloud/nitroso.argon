<script lang="ts">
    //@ts-ignore
    import * as Select from "$lib/components/ui/select";
    //@ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    import {Button} from "$lib/components/ui/button";
    import {Switch} from "$lib/components/ui/switch";
    import {Calendar} from "$lib/components/ui/calendar";
    import {CalendarIcon} from "lucide-svelte";
    import type {Selected} from "bits-ui";
    import {CalendarDate, type DateValue, getLocalTimeZone} from "@internationalized/date";
    import type {DiscountRecordReq, DiscountRecordRes} from "$lib/api/core/data-contracts";
    import {cn} from "$lib/utils";
    import {_} from "svelte-i18n";
    import {lang, formatCalendarDate, formatClockTime} from "$lib/i18n";
    import {DAYS_OF_WEEK, HALF_HOURS, LEAD_TIME_HOURS, withValue} from "../Costs/times";

    // Slot matchers for a discount, mirroring the cost-policy dialog pattern
    // (owner mandate: never a typing input where a tap control works). Each
    // matcher sits behind a toggle; everything left off = wildcard. The parent
    // dialog calls validate() then build() on submit via bind:this.
    type SlotSeed = Pick<
        DiscountRecordRes,
        "matchDate" | "matchTime" | "matchDayOfWeek" | "matchDirection"
        | "leadTimeUnderHours" | "effectiveAt" | "expiresAt"
    >;
    type SlotValues = Pick<
        DiscountRecordReq,
        "matchDate" | "matchTime" | "matchDayOfWeek" | "matchDirection"
        | "leadTimeUnderHours" | "effectiveAt" | "expiresAt"
    >;

    // existing values to prefill (null for a fresh create)
    export let seed: SlotSeed | null = null;
    // reseeds the form every time the surrounding dialog opens
    export let open = false;

    // ---- form state (same shape as PolicyDialog) ----
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
    let useEffective = false;
    let effectiveDate: DateValue | undefined = undefined;
    let selEffectiveTime: Selected<string> | undefined = undefined;
    let useExpiry = false;
    let expiryDate: DateValue | undefined = undefined;
    let selExpiryTime: Selected<string> | undefined = undefined;

    let errorKeys: string[] = [];

    $: timeOptions = withValue(HALF_HOURS, seed?.matchTime);

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

    function seedState() {
        const p = seed;
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
        if (open) seedState();
    }

    // ---- validation + wire values (parent calls via bind:this) ----
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

    export function validate(): boolean {
        const errs: string[] = [];
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
        errorKeys = errs;
        return errs.length === 0;
    }

    export function build(): SlotValues {
        return {
            matchDate: useDate && matchDate != null ? toZincDate(matchDate) : null,
            matchTime: useTime ? (selTime?.value ?? null) : null,
            matchDayOfWeek: useDay ? (selDay?.value ?? null) : null,
            matchDirection: useDirection ? (selDirection?.value ?? null) : null,
            leadTimeUnderHours: useLead && selLead?.value ? parseInt(selLead.value, 10) : null,
            effectiveAt: useEffective && effectiveDate != null ? toIso(effectiveDate, selEffectiveTime?.value) : null,
            expiresAt: useExpiry && expiryDate != null ? toIso(expiryDate, selExpiryTime?.value) : null,
        };
    }
</script>

<div class="flex flex-col gap-3">
    <div class="text-sm font-medium text-primary">{$_('admin.costs.policies.matchersLabel', {locale: $lang})}</div>
    <p class="text-sm text-muted-foreground">{$_('discounts.matchers.hint', {locale: $lang})}</p>

    <div class="flex items-center gap-3">
        <Switch bind:checked={useDate} aria-label={$_('admin.costs.policies.matchDate', {locale: $lang})}/>
        <span class="text-sm w-28 shrink-0 text-primary">{$_('admin.costs.policies.matchDate', {locale: $lang})}</span>
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
        <span class="text-sm w-28 shrink-0 text-primary">{$_('admin.costs.policies.matchTime', {locale: $lang})}</span>
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
        <span class="text-sm w-28 shrink-0 text-primary">{$_('admin.costs.policies.matchDay', {locale: $lang})}</span>
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
        <span class="text-sm w-28 shrink-0 text-primary">{$_('admin.costs.policies.matchDirection', {locale: $lang})}</span>
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
        <span class="text-sm w-28 shrink-0 text-primary">{$_('admin.costs.policies.matchLead', {locale: $lang})}</span>
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

    <div class="text-sm font-medium text-primary">{$_('admin.costs.policies.windowLabel', {locale: $lang})}</div>

    <div class="flex items-center gap-3 flex-wrap">
        <Switch bind:checked={useEffective}
                aria-label={$_('admin.costs.policies.effectiveFrom', {locale: $lang})}/>
        <span class="text-sm w-28 shrink-0 text-primary">{$_('admin.costs.policies.effectiveFrom', {locale: $lang})}</span>
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
        <span class="text-sm w-28 shrink-0 text-primary">{$_('admin.costs.policies.expiresAt', {locale: $lang})}</span>
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

    {#if errorKeys.length > 0}
        <ul class="flex flex-col gap-1">
            {#each errorKeys as k (k)}
                <li class="text-sm text-destructive">
                    {$_(`admin.costs.policies.errors.${k}`, {locale: $lang})}
                </li>
            {/each}
        </ul>
    {/if}
</div>
