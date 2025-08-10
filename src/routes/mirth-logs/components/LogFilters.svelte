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

<div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">Filters</h3>
		<button
			onclick={clearFilters}
			class="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
		>
			Clear All
		</button>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Level Filter List -->
		<div>
			<h4 class="mb-3 text-sm font-medium text-gray-700">Log Level</h4>
			<div class="space-y-2">
				<!-- All Levels Option -->
				<button
					onclick={() => setLevel(null)}
					class="flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all {selectedLevel ===
					null
						? 'border-blue-500 bg-blue-50 text-blue-900'
						: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}"
				>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">All Levels</span>
					</div>
					<span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
						{totalCount}
					</span>
				</button>

				<!-- Individual Level Options -->
				{#each availableLevels as level}
					<button
						onclick={() => setLevel(level as LogLevel)}
						class="flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all {selectedLevel ===
						level
							? 'border-blue-500 bg-blue-50 text-blue-900'
							: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}"
					>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium">{level}</span>
						</div>
						<span
							class="rounded-full px-2 py-1 text-xs font-semibold {selectedLevel === level
								? 'bg-blue-200 text-blue-900'
								: levelColors[level] || 'bg-gray-100 text-gray-700'}"
						>
							{levelCounts[level] || 0}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Channel Filter List -->
		<div>
			<h4 class="mb-3 text-sm font-medium text-gray-700">Channel</h4>
			<div class="space-y-2">
				<!-- All Channels Option -->
				<button
					onclick={() => setChannel(null)}
					class="flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all {selectedChannel ===
					null
						? 'border-blue-500 bg-blue-50 text-blue-900'
						: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}"
				>
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">All Channels</span>
					</div>
					<span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
						{totalCount}
					</span>
				</button>

				<!-- Individual Channel Options -->
				{#each availableChannels as channel}
					<button
						onclick={() => setChannel(channel)}
						class="flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-all {selectedChannel ===
						channel
							? 'border-blue-500 bg-blue-50 text-blue-900'
							: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'}"
					>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium">{channel}</span>
						</div>
						<span
							class="rounded-full px-2 py-1 text-xs font-semibold {selectedChannel === channel
								? 'bg-blue-200 text-blue-900'
								: 'bg-gray-100 text-gray-700'}"
						>
							{channelCounts[channel] || 0}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Active Filters Summary -->
	{#if selectedLevel || selectedChannel}
		<div class="mt-4 rounded-lg bg-blue-50 p-3">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-blue-900">Active Filters:</span>
				{#if selectedLevel}
					<span
						class="inline-flex items-center rounded-full bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900"
					>
						Level: {selectedLevel}
						<button onclick={() => setLevel(null)} class="ml-1 text-blue-600 hover:text-blue-800">
							×
						</button>
					</span>
				{/if}
				{#if selectedChannel}
					<span
						class="inline-flex items-center rounded-full bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900"
					>
						Channel: {selectedChannel}
						<button onclick={() => setChannel(null)} class="ml-1 text-blue-600 hover:text-blue-800">
							×
						</button>
					</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
