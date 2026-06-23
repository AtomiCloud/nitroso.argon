<script lang="ts">
    import type {DateRange} from "bits-ui";
    import {getLocalTimeZone} from "@internationalized/date";
    import {cn} from "$lib/utils";
    import {Button} from "$lib/components/ui/button";
    import {RangeCalendar} from "$lib/components/ui/range-calendar";
    // @ts-ignore
    import * as Popover from "$lib/components/ui/popover";
    import {CalendarIcon} from "lucide-svelte";
    import {lang, formatCalendarDate} from "$lib/i18n";

    export let value: DateRange;
    export let onValueChange: (d: DateRange) => void;
    export let numberOfMonths: number;

    export let placeholder: string;

</script>

<div class="w-full lg:max-w-60">
    <Popover.Root openFocus>
        <Popover.Trigger asChild let:builder>
            <Button
                    variant="outline"
                    class={cn(
          "w-full  justify-start text-left font-normal",
          !value && "text-muted-foreground"
        )}
                    builders={[builder]}
            >
                <CalendarIcon class="mr-2 h-4 w-4"/>
                {#if value && value.start}
                    {#if value.end}
                        {formatCalendarDate(value.start.toDate(getLocalTimeZone()), $lang)} - {formatCalendarDate(
                        value.end.toDate(getLocalTimeZone()), $lang
                    )}
                    {:else}
                        {formatCalendarDate(value.start.toDate(getLocalTimeZone()), $lang)}
                    {/if}
                {:else}
                    {placeholder}
                {/if}
            </Button>
        </Popover.Trigger>
        <Popover.Content class="w-auto p-0" align="start">
            <RangeCalendar
                    placeholder={value?.start}
                    bind:value
                    initialFocus
                    {onValueChange}
                    {numberOfMonths}
            />
        </Popover.Content>
    </Popover.Root>
</div>
