<script lang="ts">

    import {Input, type InputEvents} from "$lib/components/ui/input";
    import type {HTMLInputAttributes} from "svelte/elements";
    import type {ZodIssue} from "zod";


    type $$Props = HTMLInputAttributes & {path:string} & {errors?:ZodIssue[]}
    type $$Events = InputEvents;

    let className: $$Props["class"] = undefined;
    export let value: $$Props["value"] = undefined;
    export let errors: ZodIssue[] | undefined = undefined;
    export let path: string;


    $: error = errors?.find(e => e.path.join(".") === path);

    export {className as class};
</script>

<div class="flex flex-col gap-1.5">
    <Input class={className}
           bind:value
           on:blur
           on:change
           on:click
           on:focus
           on:keydown
           on:keypress
           on:keyup
           on:mouseover
           on:mouseenter
           on:mouseleave
           on:paste
           on:input
           {...$$restProps}
    />
    <div class="text-sm text-destructive {error == null ? 'opacity-0' : 'opacity-1'}">
        {error?.message ?? "null"}
    </div>
</div>
