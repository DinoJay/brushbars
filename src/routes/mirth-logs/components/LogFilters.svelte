<!-- runes -->
<script lang="ts">
	import type { LogLevel } from '$stores/logStore.svelte';
	import type { TimelineEntry } from '$lib/types';

	// Use only provided entries; no store fallback
	const {
		entries,
		onFiltersChange = null,
		onFiltered = null
	} = $props<{
		entries: TimelineEntry[];
		onFiltersChange?: (level: LogLevel | null, channel: string | null) => void;
		onFiltered?: (filtered: TimelineEntry[]) => void;
	}>();

	const effectiveEntries = $derived(entries);

	let selectedLevel = $state<LogLevel | null>(null);
	let selectedChannel = $state<string | null>(null);

	// Apply filters locally and expose filtered entries
	let filteredEntries = $derived.by(() => {
		let list = effectiveEntries || [];
		if (selectedLevel) list = list.filter((e: any) => e.level === selectedLevel);
		if (selectedChannel) list = list.filter((e: any) => e.channel === selectedChannel);
		return list;
	});

	$effect(() => {
		if (onFiltered) onFiltered(filteredEntries);
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
		const channels = new Set<string>();
		effectiveEntries.forEach((entry: any) => {
			if (entry.channel) channels.add(entry.channel);
		});
		return Array.from(channels).sort();
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
			counts[entry.channel] = (counts[entry.channel] || 0) + 1;
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
		if (onFiltersChange) onFiltersChange(selectedLevel, selectedChannel);
	}

	function setChannel(channel: string | null) {
		selectedChannel = channel;
		if (onFiltersChange) onFiltersChange(selectedLevel, selectedChannel);
	}

	function clearFilters() {
		setLevel(null);
		setChannel(null);
	}

	// Level color mapping
	const levelColors: Record<string, string> = {
		DEBUG: 'bg-gray-100 text-gray-800 border-gray-300',
		INFO: 'bg-blue-100 text-blue-800 border-blue-300',
		WARN: 'bg-yellow-100 text-yellow-800 border-yellow-300',
		ERROR: 'bg-red-100 text-red-800 border-red-300'
	};
</script>

<div class="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<h3 class="text-sm font-medium text-gray-900">Filters</h3>
			<span class="text-xs text-gray-500">Total: {totalCount.toLocaleString()}</span>
		</div>
		{#if selectedLevel || selectedChannel}
			<button onclick={clearFilters} class="text-xs text-blue-600 hover:text-blue-800">
				Clear all
			</button>
		{/if}
	</div>

	<div class="flex flex-wrap gap-3">
		<!-- Level Filter -->
		<div class="flex items-center space-x-2">
			<label class="text-xs font-medium text-gray-700">Level:</label>
			<div class="flex space-x-1">
				<button
					onclick={() => setLevel(null)}
					class="rounded px-2 py-1 text-xs font-medium transition-colors {!selectedLevel
						? 'bg-blue-100 text-blue-800'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				>
					All ({totalCount.toLocaleString()})
				</button>
				{#each availableLevels as level}
					<button
						onclick={() => setLevel(level as any)}
						class="rounded px-2 py-1 text-xs font-medium transition-colors {selectedLevel === level
							? levelColors[level] || 'bg-blue-100 text-blue-800'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					>
						{level} ({levelCounts[level]?.toLocaleString() || 0})
					</button>
				{/each}
			</div>
		</div>

		<!-- Channel Filter -->
		{#if availableChannels.length > 0}
			<div class="flex items-center space-x-2">
				<label class="text-xs font-medium text-gray-700">Channel:</label>
				<div class="flex space-x-1">
					<button
						onclick={() => setChannel(null)}
						class="rounded px-2 py-1 text-xs font-medium transition-colors {!selectedChannel
							? 'bg-blue-100 text-blue-800'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
					>
						All
					</button>
					{#each availableChannels.slice(0, 10) as channel}
						<button
							onclick={() => setChannel(channel)}
							class="rounded px-2 py-1 text-xs font-medium transition-colors {selectedChannel ===
							channel
								? 'bg-blue-100 text-blue-800'
								: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
						>
							{channel} ({channelCounts[channel]?.toLocaleString() || 0})
						</button>
					{/each}
					{#if availableChannels.length > 10}
						<span class="px-2 py-1 text-xs text-gray-500">
							+{availableChannels.length - 10} more
						</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
