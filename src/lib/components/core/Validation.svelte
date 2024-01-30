<script lang="ts">
    import type {ZodIssue} from "zod";

    export let errors: ZodIssue[] | undefined = undefined;

    export let classNames: string ="";

    export let taints: Record<string,boolean>;

    export let path: string;

    $: error = errors?.find(e => e.path.join(".") === path);
    $: show = error != null && taints[path] === true;
</script>


<div class="flex flex-col gap-1.5 {classNames}">
    <slot/>
    <div class="text-sm text-destructive {show ? 'opacity-1' : 'opacity-0'}">
        {error?.message ?? "null"}
    </div>
</div>
