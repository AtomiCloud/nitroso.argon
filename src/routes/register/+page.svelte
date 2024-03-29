<script lang="ts">
    import {Button} from "$lib/components/ui/button";
    import {Label} from "$lib/components/ui/label";
    import {Input} from "$lib/components/ui/input";
    import {api} from "../../store";
    import {get} from "svelte/store";
    import {toResult} from "$lib/utility";
    import Page from "$lib/components/complex/page.svelte";
    import type {ProblemDetails} from "../../errors/problem_details";
    import {Check, Loader, LucideLoader, X} from "lucide-svelte";
    import {goto} from "$app/navigation";

    //@ts-ignore
    import * as Card from "$lib/components/ui/card";
    //@ts-ignore
    import * as Tooltip from "$lib/components/ui/tooltip";
    import {Checkbox} from "$lib/components/ui/checkbox";

    let name = "";

    let typed = false;

    function errors(name: string): string[] {
        const err = [];
        if (name.length < 1) err.push("Username must contain at least 1 character");
        if (name.length > 256) err.push("Username must be less than 256 characters");
        if (!name.match(/^[0-9a-z-]+$/)) err.push("Username must only contain lowercase letters, numbers, and dashes");
        if (!name.match(/^[a-z](-?[a-z0-9]+)*$/)) err.push("Username must start with a letter and cannot end with dashes");
        return err;
    }

    let problem: ProblemDetails | null = null;

    const a = get(api);

    async function exist(name: string): Promise<boolean> {
        if (name === "") return false;
        const results = toResult(() => a.vUserExistDetail(name, "1"), "Failed to check if user exists");
        const ok = await results.isOk();
        if (ok) {
            const r = await results.unwrap();
            return r.exists ?? false;
        } else {
            problem = await results.unwrapErr();
            return false;
        }
    }

    async function createUser(name: string): Promise<void> {
        submitting = true;
        const r = toResult(() => a.vUserCreate("1", {username: name}), "Failed to create user");
        await r.match({
            ok: (o) => {
                console.log(o);
                goto("/");
            },
            err: (e) => {
                problem = e;
            }
        })
        submitting = false;
    }

    let uExist = false;
    let acceptTerms = false;
    let acceptPrivacy = false;
    let submitting = false;

    function update(u: boolean): string {
        uExist = u;
        return ""
    }


    $: disabled = submitting || errors(name).length > 0 || uExist || !acceptTerms || !acceptPrivacy;

</script>

<Page
        notFoundMessage="User not found"
        empty={false}
        {problem}
        queue={0}
>
    <div class="flex justify-center">
        <Card.Root
                class="w-full p-0 border-none shadow-none md:border-solid md:border md:shadow-sm m-0 md:m-8 lg:w-[640px] md:p-8">
            <Card.Header>
                <Card.Description>
                    Choose your username for BunnyBooker.
                    This cannot be changed and needs to be unique.
                </Card.Description>
            </Card.Header>
            <Card.Content>
                <form>
                    <div class="grid w-full items-center gap-4">
                        <div class="flex flex-col space-y-1.5">
                            <Label for="name">Username</Label>
                            <div class="flex justify-between space-x-5 items-center">
                                <Input id="name" placeholder="Your username" on:input={() => typed=true}
                                       bind:value={name}/>
                                {#await exist(name)}
                                    <div class="animate-spin">
                                        <Loader class="w-6 h-6 text-muted-foreground"/>
                                    </div>
                                {:then bool}
                                    {update(bool)}
                                    {#if bool}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger>
                                                <X class="w-6 h-6 text-red-400"/>
                                            </Tooltip.Trigger>
                                            <Tooltip.Content>
                                                <p>Username has been taken</p>
                                            </Tooltip.Content>
                                        </Tooltip.Root>
                                    {:else}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger>
                                                <Check class="w-6 h-6 text-green-400"/>
                                            </Tooltip.Trigger>
                                            <Tooltip.Content>
                                                <p>Username has not been taken</p>
                                            </Tooltip.Content>
                                        </Tooltip.Root>
                                    {/if}
                                {/await}
                            </div>
                            {#if errors(name).length > 0 && typed}
                                <p class="text-sm text-red-400">
                                    {errors(name)[0]}
                                </p>
                            {/if}
                        </div>
                        <div class="flex align-center gap-2">
                            <Checkbox id="terms" bind:checked={acceptTerms}  aria-labelledby="terms-label" />
                            <Label for="terms"
                                   id="terms-label">
                                I accept the <a href="/terms" target="_blank" class="underline hover:text-amber-500">terms and conditions</a>
                            </Label>
                        </div>
                        <div class="flex align-center gap-2">
                            <Checkbox id="privacy" bind:checked={acceptPrivacy}  />
                            <Label for="privacy">
                                I accept the <a href="/privacy" target="_blank" class="underline hover:text-amber-500">privacy policy</a>
                            </Label>
                        </div>
                    </div>
                </form>
            </Card.Content>
            <Card.Footer class="flex justify-end">
                <Button on:click={() => createUser(name)} {disabled}>
                    {#if submitting}
                        <LucideLoader class="mr-2 h-4 w-4 animate-spin"/>
                    {/if}
                    Confirm
                </Button>
            </Card.Footer>
        </Card.Root>


    </div>
</Page>
