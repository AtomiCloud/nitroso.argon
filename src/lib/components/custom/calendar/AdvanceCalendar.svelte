<script lang="ts">
    import { Calendar as CalendarPrimitive } from "bits-ui";
    // @ts-ignore
    import * as Calendar from "$lib/components/ui/calendar";
    // @ts-ignore
    import * as Select from "$lib/components/ui/select";
    import { cn } from "$lib/utils";
    import {
        CalendarDate,
        DateFormatter,
        getLocalTimeZone,
        today
    } from "@internationalized/date";
    import {_} from "svelte-i18n";
    import {lang} from "$lib/i18n";

    type $$Props = CalendarPrimitive.Props & {years: number, after: boolean} ;
    type $$Events = CalendarPrimitive.Events;

    export let value: $$Props["value"] = undefined;
    export let placeholder: $$Props["placeholder"] = today(getLocalTimeZone());
    export let weekdayFormat: $$Props["weekdayFormat"] = "short";

    // Map the app locale to a BCP-47 tag so month names render locale-aware.
    const INTL_TAG = { en: "en-SG", zh: "zh-SG", ms: "ms-MY" };
    $: localeTag = INTL_TAG[$lang] ?? INTL_TAG.en;

    $: monthFmt = new DateFormatter(localeTag, {
        month: "long"
    });

    $: monthOptions = Array.from({ length: 12 }, (_v, i) => ({
        value: i + 1,
        label: monthFmt.format(new CalendarDate(2021, i + 1, 1).toDate(getLocalTimeZone()))
    }));

    export let years = 100;
    export let after = true;

    const yearOptions = Array.from({ length: years }, (_, i) => ({
        label: String(after ? new Date().getFullYear() + i: new Date().getFullYear() - i),
        value: after ? new Date().getFullYear() + i :  new Date().getFullYear() - i
    }));

    $: defaultYear = placeholder
        ? {
            value: placeholder.year,
            label: String(placeholder.year)
        }
        : undefined;

    $: defaultMonth = placeholder
        ? {
            value: placeholder.month,
            label: monthFmt.format(placeholder.toDate(getLocalTimeZone()))
        }
        : undefined;

    let className: $$Props["class"] = undefined;
    export { className as class };
</script>

<CalendarPrimitive.Root
        bind:value
        bind:placeholder
        {weekdayFormat}
        class={cn("p-3 rounded-md border", className)}
        {...$$restProps}
        on:keydown
        let:months
        let:weekdays
>
    <Calendar.Header>
        <Calendar.Heading class="flex items-center justify-between w-full gap-2">
            <Select.Root
                    selected={defaultMonth}
                    items={monthOptions}
                    onSelectedChange={(v) => {
          if (!v || !placeholder) return;
          if (v.value === placeholder?.month) return;
          placeholder = placeholder.set({ month: v.value });
        }}
            >
                <Select.Trigger aria-label={$_("calendar.selectMonth", { locale: $lang })} class="w-[60%]">
                    <Select.Value placeholder={$_("calendar.selectMonth", { locale: $lang })} />
                </Select.Trigger>
                <Select.Content class="max-h-[200px] overflow-y-auto">
                    {#each monthOptions as { value, label }}
                        <Select.Item {value} {label}>
                            {label}
                        </Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
            <Select.Root
                    selected={defaultYear}
                    items={yearOptions}
                    onSelectedChange={(v) => {
          if (!v || !placeholder) return;
          if (v.value === placeholder?.year) return;
          placeholder = placeholder.set({ year: v.value });
        }}
            >
                <Select.Trigger aria-label={$_("calendar.selectYear", { locale: $lang })} class="w-[40%]">
                    <Select.Value placeholder={$_("calendar.selectYear", { locale: $lang })} />
                </Select.Trigger>
                <Select.Content class="max-h-[200px] overflow-y-auto">
                    {#each yearOptions as { value, label }}
                        <Select.Item {value} {label}>
                            {label}
                        </Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        </Calendar.Heading>
    </Calendar.Header>
    <Calendar.Months>
        {#each months as month}
            <Calendar.Grid>
                <Calendar.GridHead>
                    <Calendar.GridRow class="flex">
                        {#each weekdays as weekday}
                            <Calendar.HeadCell>
                                {weekday.slice(0, 2)}
                            </Calendar.HeadCell>
                        {/each}
                    </Calendar.GridRow>
                </Calendar.GridHead>
                <Calendar.GridBody>
                    {#each month.weeks as weekDates}
                        <Calendar.GridRow class="w-full mt-2">
                            {#each weekDates as date}
                                <Calendar.Cell {date}>
                                    <Calendar.Day {date} month={month.value} />
                                </Calendar.Cell>
                            {/each}
                        </Calendar.GridRow>
                    {/each}
                </Calendar.GridBody>
            </Calendar.Grid>
        {/each}
    </Calendar.Months>
</CalendarPrimitive.Root>
