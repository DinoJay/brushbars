<script lang="ts">
	import type { TimelineEntry } from '$lib/types';

	// Use only provided entries; no store fallback
	const { entries, selectedRange } = $props<{
		entries: TimelineEntry[];
		selectedRange: [Date, Date] | null;
	}>();

	// Track expanded rows
	let expandedRows = $state(new Set());

	// Lazy loading state
	let visibleCount = $state(50); // Start with 50 entries
	let isLoading = $state(false);
	let tableContainer = $state(null);

	// Level styling
	const levelStyles = {
		ERROR: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🔴' },
		WARN: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '🟡' },
		INFO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '' },
		DEBUG: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '⚪' }
	};

	// Computed visible entries
	const effectiveEntries = $derived(entries);
	const visibleEntries = $derived.by(() => effectiveEntries.slice(0, visibleCount));

	// Check if there are more entries to load
	const hasMoreEntries = $derived.by(() => visibleCount < effectiveEntries.length);

	function formatTime(timestamp: string | Date) {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function toggleRow(logId: string | number) {
		if (expandedRows.has(logId)) {
			expandedRows.delete(logId);
		} else {
			expandedRows.add(logId);
		}
		expandedRows = new Set(expandedRows); // Trigger reactivity
	}

	function isExpanded(logId: string | number) {
		return expandedRows.has(logId);
	}

	// Load more entries
	async function loadMore() {
		if (isLoading || !hasMoreEntries) return;

		isLoading = true;

		// Simulate loading delay for better UX
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Load 50 more entries
		visibleCount = Math.min(visibleCount + 50, entries.length);
		isLoading = false;
	}

	// Reset visible count when filtered entries change
	$effect(() => {
		if (effectiveEntries.length > 0) {
			visibleCount = Math.min(50, effectiveEntries.length);
		}
	});

	// Handle scroll to load more
	function handleScroll(event: any) {
		const { scrollTop, scrollHeight, clientHeight } = event.target;
		const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

		// Load more when user scrolls to 80% of the table
		if (scrollPercentage > 0.8 && hasMoreEntries && !isLoading) {
			loadMore();
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	<!-- Header -->
	<div class="border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900">Log Entries</h3>
			<div class="flex items-center space-x-4 text-sm text-gray-500">
				<span>Showing {visibleEntries.length} of {effectiveEntries.length} entries</span>
				{#if selectedRange}
					<span
						class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
					>
						Filtered
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Table with max height and scroll -->
	<div class="overflow-hidden">
		{#if effectiveEntries.length > 0}
			<div
				bind:this={tableContainer}
				onscroll={handleScroll}
				class="overflow-x-auto overflow-y-auto"
				style="max-height: 600px;"
			>
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="sticky top-0 z-10 bg-gray-50">
						<tr>
							<th
								class="w-12 bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							></th>
							<th
								class="bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Time</th
							>
							<th
								class="bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Level</th
							>
							<th
								class="bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Channel</th
							>
							<th
								class="bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Message</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100 bg-white">
						{#each visibleEntries as log, index}
							<tr class="transition-colors duration-150 hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<button
										onclick={() => toggleRow(log.id)}
										class="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-gray-200"
										title={isExpanded(log.id) ? 'Collapse' : 'Expand'}
									>
										{#if isExpanded(log.id)}
											<span class="text-sm text-gray-600">−</span>
										{:else}
											<span class="text-sm text-gray-600">+</span>
										{/if}
									</button>
								</td>
								<td class="px-6 py-4 font-mono text-sm whitespace-nowrap text-gray-900">
									{formatTime(log.timestamp)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium {levelStyles[
											log.level as keyof typeof levelStyles
										]?.bg} {levelStyles[log.level as keyof typeof levelStyles]?.text} {levelStyles[
											log.level as keyof typeof levelStyles
										]?.border}"
									>
										{levelStyles[log.level]?.icon}
										{log.level}
									</span>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
									{log.channel || '—'}
								</td>
								<td class="px-6 py-4 text-sm text-gray-900">
									<div
										class="max-w-lg {isExpanded(log.id) ? '' : 'truncate'}"
										title={isExpanded(log.id) ? '' : log.message}
									>
										{log.message}
									</div>
								</td>
							</tr>
							{#if isExpanded(log.id)}
								<tr class="bg-gray-50">
									<td></td>
									<td colspan="4" class="px-6 py-4">
										<div class="rounded-lg border border-gray-200 bg-white p-4">
											<div class="mb-2 text-xs text-gray-500">Full Message:</div>
											<pre
												class="font-mono text-sm break-words whitespace-pre-wrap text-gray-900">{log.message}</pre>
										</div>
									</td>
								</tr>
							{/if}
						{/each}

						<!-- Loading indicator -->
						{#if isLoading}
							<tr>
								<td colspan="5" class="px-6 py-4 text-center">
									<div class="flex items-center justify-center space-x-2 text-gray-500">
										<div
											class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
										></div>
										<span class="text-sm">Loading more entries...</span>
									</div>
								</td>
							</tr>
						{/if}

						<!-- Load more button -->
						{#if hasMoreEntries && !isLoading}
							<tr>
								<td colspan="5" class="px-6 py-4 text-center">
									<button
										onclick={loadMore}
										class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
									>
										Load More ({effectiveEntries.length - visibleEntries.length} remaining)
									</button>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl text-gray-400">📋</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">No logs found</h3>
				<p class="text-gray-500">No log data available</p>
			</div>
		{/if}
	</div>
</div>
