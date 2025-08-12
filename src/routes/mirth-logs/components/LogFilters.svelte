<!-- runes -->
<script lang="ts">
	import type { LogLevel } from '$stores/logStore.svelte';
	import type { TimelineEntry } from '$lib/types';

	// Keep reactivity by using a single props object (Svelte 5 runes)
	const props = $props<{
		entries: TimelineEntry[];
		onFiltersChange?: (level: LogLevel | null, channel: string | null) => void;
		onFiltered?: (filtered: TimelineEntry[]) => void;
	}>();

	const effectiveEntries = $derived(props.entries || []);

	let selectedLevel = $state<LogLevel | null>(null);
	let selectedChannel = $state<string | null>(null); // stores NORMALIZED channel value

	// Channel normalization helpers (keep in sync with store logic)
	function normalizeChannelName(name: string | null | undefined): string {
		if (!name) return '';
		return String(name)
			.trim()
			.replace(/\s*\([^)]*\)\s*$/, '')
			.toUpperCase();
	}

	function getEntryChannel(entry: any): string | null {
		return (entry?.channel ?? entry?.channelName ?? null) as string | null;
	}

	function channelMatches(entry: any, selected: string | null): boolean {
		if (!selected) return true;
		const entryNorm = normalizeChannelName(getEntryChannel(entry));
		const selectedNorm = normalizeChannelName(selected);
		return entryNorm !== '' && entryNorm === selectedNorm;
	}

	// Apply filters locally and expose filtered entries
	let filteredEntries = $derived.by(() => {
		let list = effectiveEntries || [];
		if (selectedLevel) list = list.filter((e: any) => e.level === selectedLevel);
		if (selectedChannel) list = list.filter((e: any) => channelMatches(e, selectedChannel));
		return list;
	});

	$effect(() => {
		if (props.onFiltered) props.onFiltered(filteredEntries);
	});

	// Available levels and channels (from selected day data only)
	let availableLevels = $derived.by(() => {
		const levels = new Set<string>();
		effectiveEntries.forEach((entry: any) => {
			if (entry.level) levels.add(entry.level);
		});
		return Array.from(levels).sort();
	});

	let availableChannels = $derived.by(() => {
		const counts: Record<string, number> = {};
		effectiveEntries.forEach((entry: any) => {
			const norm = normalizeChannelName(getEntryChannel(entry));
			if (!norm) return;
			counts[norm] = (counts[norm] || 0) + 1;
		});
		return Object.keys(counts).sort();
	});

	// Count entries for each level (from selected day data only)
	let levelCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		effectiveEntries.forEach((entry: any) => {
			counts[entry.level] = (counts[entry.level] || 0) + 1;
		});
		return counts;
	});

	// Count entries for each channel (from selected day data only)
	let channelCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		effectiveEntries.forEach((entry: any) => {
			const norm = normalizeChannelName(getEntryChannel(entry));
			if (!norm) return;
			counts[norm] = (counts[norm] || 0) + 1;
		});
		return counts;
	});

	// Total count for display (from selected day data only)
	let totalCount = $derived.by(() => {
		const count = effectiveEntries.length;
		return count;
	});

	function setLevel(level: LogLevel | null) {
		selectedLevel = level;
		if (props.onFiltersChange) props.onFiltersChange(selectedLevel, selectedChannel);
	}

	function setChannel(channel: string | null) {
		selectedChannel = channel ? normalizeChannelName(channel) : null;
		if (props.onFiltersChange) props.onFiltersChange(selectedLevel, selectedChannel);
	}

	function clearFilters() {
		setLevel(null);
		setChannel(null);
	}

	// Level color mapping using CSS custom properties
	const levelColors: Record<string, string> = {
		DEBUG: 'text-xs font-medium rounded px-2 py-1',
		INFO: 'text-xs font-medium rounded px-2 py-1',
		WARN: 'text-xs font-medium rounded px-2 py-1',
		ERROR: 'text-xs font-medium rounded px-2 py-1'
	};
</script>

<div
	class="mb-4 rounded-lg border p-4 shadow-sm"
	style="background-color: var(--color-bg-secondary); border-color: var(--color-border);"
>
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<h3 class="text-sm font-medium" style="color: var(--color-text-primary);">Filters</h3>
			<span class="text-xs" style="color: var(--color-text-secondary);"
				>Total: {totalCount.toLocaleString()}</span
			>
		</div>
		{#if selectedLevel || selectedChannel}
			<button
				onclick={clearFilters}
				class="text-xs transition-colors"
				style="color: var(--color-accent);"
			>
				Clear all
			</button>
		{/if}
	</div>

	<div class="flex flex-wrap gap-3">
		<!-- Level Filter -->
		<div class="flex items-center space-x-2">
			<label class="text-xs font-medium" style="color: var(--color-text-secondary);">Level:</label>
			<div class="flex space-x-1">
				<button
					onclick={() => setLevel(null)}
					class="rounded px-2 py-1 text-xs font-medium transition-colors"
					style="
						{!selectedLevel
						? 'background-color: var(--color-accent-light); color: var(--color-accent-dark);'
						: 'background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);'}
					"
				>
					All ({totalCount.toLocaleString()})
				</button>
				{#each availableLevels as level}
					<button
						onclick={() => setLevel(level as any)}
						class="rounded px-2 py-1 text-xs font-medium transition-colors"
						style="
							{selectedLevel === level
							? 'background-color: var(--color-accent-light); color: var(--color-accent-dark);'
							: 'background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);'}
						"
					>
						{level} ({levelCounts[level]?.toLocaleString() || 0})
					</button>
				{/each}
			</div>
		</div>

		<!-- Channel Filter -->
		{#if availableChannels.length > 0}
			<div class="flex items-center space-x-2">
				<label class="text-xs font-medium" style="color: var(--color-text-secondary);"
					>Channel:</label
				>
				<div class="flex space-x-1">
					<button
						onclick={() => setChannel(null)}
						class="rounded px-2 py-1 text-xs font-medium transition-colors"
						style="
							{!selectedChannel
							? 'background-color: var(--color-accent-light); color: var(--color-accent-dark);'
							: 'background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);'}
						"
					>
						All
					</button>
					{#each availableChannels.slice(0, 10) as channel}
						<button
							onclick={() => setChannel(channel)}
							class="rounded px-2 py-1 text-xs font-medium transition-colors"
							style="
								{selectedChannel === channel
								? 'background-color: var(--color-accent-light); color: var(--color-accent-dark);'
								: 'background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);'}
							"
						>
							{channel} ({channelCounts[channel]?.toLocaleString() || 0})
						</button>
					{/each}
					{#if availableChannels.length > 10}
						<span class="px-2 py-1 text-xs" style="color: var(--color-text-secondary);">
							+{availableChannels.length - 10} more
						</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
