<script lang="ts">
	import Page from "$lib/components/complex/page.svelte";
	import * as Card from "$lib/components/ui/card";
	import * as Accordion from "$lib/components/ui/accordion";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { ChevronDown, ExternalLink, GitCommit, Package } from "lucide-svelte";
	import type { PageData } from './$types';

	export let data: PageData;

	const INITIAL_DISPLAY_COUNT = 10;
	let displayCount = INITIAL_DISPLAY_COUNT;
	let isLoading = false;

	$: displayedVersions = data.versions.slice(0, displayCount);
	$: hasMore = displayCount < data.versions.length;

	function loadMore() {
		isLoading = true;
		setTimeout(() => {
			displayCount += 10;
			isLoading = false;
		}, 300);
	}

	function getCategoryColor(category: string): string {
		switch (category) {
			case 'Features':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'Bug Fixes':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
			case 'Documentation':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'Dependency Upstreams':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
		}
	}
</script>

<style lang="css">
	h1 {
		font-family: 'Cabin', 'sans-serif';
	}
</style>

<svelte:head>
	<title>Changelog | BunnyBooker</title>
	<meta name="description" content="View the changelog for BunnyBooker backend services. See what's new, what's fixed, and what's changed." />
</svelte:head>

<Page notFoundMessage="Changelog not found" empty={data.versions.length === 0}>
	<div class="flex flex-col">
		<div class="w-11/12 max-w-[900px] mx-auto py-8 flex-1">
			<div class="flex items-center gap-3 mb-2">
				<Package class="w-8 h-8 text-primary" />
				<h1 class="text-4xl font-bold">Changelog</h1>
			</div>
			<p class="text-muted-foreground mb-8">
				Track changes to the BunnyBooker backend services. See what's new, what's fixed, and what's improved.
			</p>

			<div class="space-y-6">
					{#each displayedVersions as version, index (version.version)}
						<Card.Card class="overflow-hidden">
							<Card.CardHeader class="pb-3">
								<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
									<div class="flex items-center gap-3">
										<a
											href={version.versionUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="text-xl font-semibold hover:text-primary transition-colors flex items-center gap-1"
										>
											v{version.version}
											<ExternalLink class="w-4 h-4" />
										</a>
									</div>
									<time datetime={version.date} class="text-sm text-muted-foreground">
										{new Date(version.date).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										})}
									</time>
								</div>
							</Card.CardHeader>
							<Card.CardContent>
								<Accordion.Accordion multiple class="w-full">
									{#each version.sections as section, sectionIndex (section.category)}
										<Accordion.Item value={`section-${index}-${sectionIndex}`}>
											<Accordion.Trigger class="hover:no-underline">
												<div class="flex items-center gap-2">
													<Badge class="{getCategoryColor(section.category)} border-0">
														{section.emoji} {section.category}
													</Badge>
													<span class="text-sm text-muted-foreground">
														({section.changes.length} {section.changes.length === 1 ? 'change' : 'changes'})
													</span>
												</div>
											</Accordion.Trigger>
											<Accordion.Content>
												<ul class="space-y-2 mt-2">
													{#each section.changes as change, changeIndex (change.commitHash)}
														<li class="flex items-start gap-2 text-sm">
															<GitCommit class="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
															<span class="flex-1">{change.description}</span>
															<a
																href={change.commitUrl}
																target="_blank"
																rel="noopener noreferrer"
																class="text-muted-foreground hover:text-primary transition-colors font-mono text-xs"
															>
																{change.commitHash}
															</a>
														</li>
													{/each}
												</ul>
											</Accordion.Content>
										</Accordion.Item>
									{/each}
								</Accordion.Accordion>
							</Card.CardContent>
						</Card.Card>
					{/each}
				</div>

				{#if hasMore}
					<div class="flex justify-center mt-8">
						<Button
							variant="outline"
							size="lg"
							on:click={loadMore}
							disabled={isLoading}
							class="min-w-[200px]"
						>
							{#if isLoading}
								Loading...
							{:else}
								Load More ({data.versions.length - displayCount} remaining)
							{/if}
						</Button>
					</div>
				{/if}

				<div class="text-center mt-8 text-sm text-muted-foreground">
					<p>
						View the full changelog on
						<a
							href="https://github.com/AtomiCloud/nitroso.zinc/blob/main/Changelog.md"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary hover:underline"
						>
							GitHub
						</a>
					</p>
				</div>
		</div>
	</div>
</Page>
