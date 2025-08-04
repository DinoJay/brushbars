<!-- runes -->
<script lang="ts">
	import { logStore } from '../../stores/logStore.svelte';
	import type { LogLevel } from '../../stores/logStore.svelte';

	// Filter state
	let selectedLevel = $state<LogLevel | null>(null);
	let selectedChannel = $state<string | null>(null);

	// Available levels and channels
	let availableLevels = $derived.by(() => {
		const levels = new Set<string>();
		logStore.entries.forEach(entry => {
			if (entry.level) levels.add(entry.level);
		});
		return Array.from(levels).sort();
	});

	let availableChannels = $derived.by(() => {
		const channels = new Set<string>();
		logStore.entries.forEach(entry => {
			if (entry.channel) channels.add(entry.channel);
		});
		return Array.from(channels).sort();
	});

	// Level styling
	const levelStyles = {
		ERROR: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
		WARN: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
		INFO: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
		DEBUG: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
	};

	function clearFilters() {
		selectedLevel = null;
		selectedChannel = null;
		logStore.setSelectedLevel(null);
	}

	function setLevel(level: string | null) {
		selectedLevel = level as LogLevel | null;
		logStore.setSelectedLevel(selectedLevel);
	}

	function setChannel(channel: string | null) {
		selectedChannel = channel;
		// Note: You'll need to add channel filtering to the logStore if not already present
	}

	// Count entries for each level
	let levelCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		logStore.entries.forEach(entry => {
			counts[entry.level] = (counts[entry.level] || 0) + 1;
		});
		return counts;
	});

	// Count entries for each channel
	let channelCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		logStore.entries.forEach(entry => {
			counts[entry.channel] = (counts[entry.channel] || 0) + 1;
		});
		return counts;
	});
</script>

<div class="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-800">Filters</h3>
		<button
			on:click={clearFilters}
			class="text-sm text-gray-600 hover:text-gray-800 underline"
		>
			Clear all
		</button>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Level Filter Dropdown -->
		<div>
			<label for="level-select" class="block text-sm font-medium text-gray-700 mb-2">Log Level</label>
			<div class="relative">
				<select
					id="level-select"
					bind:value={selectedLevel}
					on:change={() => setLevel(selectedLevel)}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				>
					<option value={null}>All Levels ({logStore.entries.length})</option>
					{#each availableLevels as level}
						<option value={level}>
							{level} ({levelCounts[level] || 0})
						</option>
					{/each}
				</select>
				<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
					<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</div>
			</div>
		</div>

		<!-- Channel Filter Dropdown -->
		<div>
			<label for="channel-select" class="block text-sm font-medium text-gray-700 mb-2">Channel</label>
			<div class="relative">
				<select
					id="channel-select"
					bind:value={selectedChannel}
					on:change={() => setChannel(selectedChannel)}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				>
					<option value={null}>All Channels ({logStore.entries.length})</option>
					{#each availableChannels as channel}
						<option value={channel}>
							{channel} ({channelCounts[channel] || 0})
						</option>
					{/each}
				</select>
				<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
					<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
					</svg>
				</div>
			</div>
		</div>
	</div>

	<!-- Active Filters Summary -->
	{#if selectedLevel || selectedChannel}
		<div class="mt-4 pt-4 border-t border-gray-200">
			<div class="flex items-center space-x-2 text-sm text-gray-600">
				<span>Active filters:</span>
				{#if selectedLevel}
					<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {levelStyles[selectedLevel]?.bg} {levelStyles[selectedLevel]?.text} {levelStyles[selectedLevel]?.border}">
						Level: {selectedLevel}
					</span>
				{/if}
				{#if selectedChannel}
					<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
						Channel: {selectedChannel}
					</span>
				{/if}
			</div>
		</div>
	{/if}
</div> 