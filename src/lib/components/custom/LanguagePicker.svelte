<script lang="ts">
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import {Button} from "$lib/components/ui/button";
    import {Languages} from "lucide-svelte";
    import {_} from "svelte-i18n";
    import {lang, setLocale, SUPPORTED_LOCALES, type SupportedLocale} from "$lib/i18n";

    // Autonyms — a language is named in its own language, so these are constant
    // across catalogs and intentionally not translated.
    const LOCALE_NAMES: Record<SupportedLocale, string> = {
        en: "English",
        zh: "中文",
        ms: "Bahasa Melayu",
    };
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
        <Button
                builders={[builder]}
                variant="outline"
                size="icon"
                data-testid="language-picker"
                aria-label={$_('language.label', { locale: $lang })}>
            <Languages class="h-[1.2rem] w-[1.2rem]"/>
            <span class="sr-only">{$_('language.label', { locale: $lang })}</span>
        </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
        {#each SUPPORTED_LOCALES as code}
            <DropdownMenu.Item
                    on:click={() => setLocale(code)}
                    data-testid="locale-option-{code}"
                    class={$lang === code ? 'font-semibold' : ''}>
                {LOCALE_NAMES[code]}
            </DropdownMenu.Item>
        {/each}
    </DropdownMenu.Content>
</DropdownMenu.Root>
