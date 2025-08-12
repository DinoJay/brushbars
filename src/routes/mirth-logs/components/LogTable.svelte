<script lang="ts">
	import type { TimelineEntry } from '$lib/types';
	import MessageDetailsTabs from './MessageDetailsTabs.svelte';

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
	let tableContainer = $state<HTMLDivElement | null>(null);

	// Search functionality
	let searchQuery = $state('');
	let searchField = $state<'all' | 'message' | 'channel' | 'threadId'>('all');

	// Sorting functionality
	let sortField = $state<'timestamp' | 'level' | 'channel' | 'status' | 'message'>('timestamp');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Level styling
	const levelStyles = {
		ERROR: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
		WARN: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡' },
		INFO: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '' },
		DEBUG: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⚪' }
	};

	// Computed visible entries with search filtering and sorting
	const effectiveEntries = $derived(entries);
	const searchFilteredEntries = $derived.by(() => {
		if (!searchQuery.trim()) return effectiveEntries;

		const query = searchQuery.toLowerCase();
		return effectiveEntries.filter((log: TimelineEntry) => {
			switch (searchField) {
				case 'message':
					return (log.message ? String(log.message).toLowerCase() : '').includes(query);
				case 'channel':
					return (log.channel ? String(log.channel).toLowerCase() : '').includes(query);
				case 'threadId':
					return (log.threadId ? String(log.threadId).toLowerCase() : '').includes(query);
				case 'all':
				default:
					return (
						(log.message ? String(log.message).toLowerCase() : '').includes(query) ||
						(log.channel ? String(log.channel).toLowerCase() : '').includes(query) ||
						(log.threadId ? String(log.threadId).toLowerCase() : '').includes(query) ||
						(log.level ? String(log.level).toLowerCase() : '').includes(query) ||
						(log.status ? String(log.status).toLowerCase() : '').includes(query)
					);
			}
		});
	});

	// Sort the filtered entries
	const sortedEntries = $derived.by(() => {
		const entries = [...searchFilteredEntries];

		entries.sort((a, b) => {
			let aValue: any, bValue: any;

			switch (sortField) {
				case 'timestamp':
					aValue = new Date(a.timestamp).getTime();
					bValue = new Date(b.timestamp).getTime();
					break;
				case 'level':
					aValue = a.level || '';
					bValue = b.level || '';
					break;
				case 'channel':
					aValue = a.channel || '';
					bValue = b.channel || '';
					break;
				case 'status':
					aValue = a.status || '';
					bValue = b.status || '';
					break;
				case 'message':
					aValue = a.message || '';
					bValue = b.message || '';
					break;
				default:
					return 0;
			}

			// Handle string comparison
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}

			// Sort based on direction
			if (sortDirection === 'asc') {
				return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
			} else {
				return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
			}
		});

		return entries;
	});

	const visibleEntries = $derived.by(() => sortedEntries.slice(0, visibleCount));

	// Check if there are more entries to load
	const hasMoreEntries = $derived.by(() => visibleCount < sortedEntries.length);

	function formatTime(timestamp: string | Date) {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	// Animation state for smooth scrolling
	let isScrolling = $state(false);
	let targetScrollTop = $state(0);

	function toggleRow(logId: string | number) {
		if (expandedRows.has(logId)) {
			expandedRows.delete(logId);
		} else {
			expandedRows.add(logId);
			// Scroll into view after expansion, keeping original row visible
			setTimeout(() => {
				const expandedRow = document.querySelector(`[data-log-id="${logId}"]`);
				if (expandedRow && tableContainer) {
					// Find the original table row (the one above the expanded row)
					const originalRow = expandedRow.previousElementSibling;
					if (originalRow) {
						// Calculate position to show the original row at the top of the visible area
						const containerRect = tableContainer.getBoundingClientRect();
						const originalRowRect = originalRow.getBoundingClientRect();
						const scrollTop = tableContainer.scrollTop;

						// Position the original row so it's fully visible at the top with manual offset
						targetScrollTop = scrollTop + (originalRowRect.top - containerRect.top) - 60; // 60px offset for header and padding

						// Start Svelte-based smooth scroll animation
						animateScroll();
					}
				}
			}, 100); // Small delay to ensure DOM is updated
		}
		expandedRows = new Set(expandedRows); // Trigger reactivity
	}

	// Svelte-based smooth scroll animation
	function animateScroll() {
		if (!tableContainer || isScrolling) return;

		isScrolling = true;
		const startScrollTop = tableContainer.scrollTop;
		const distance = targetScrollTop - startScrollTop;
		const duration = 300; // 300ms animation
		const startTime = performance.now();

		function easeInOutCubic(t: number): number {
			return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
		}

		function animate(currentTime: number) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeInOutCubic(progress);

			tableContainer!.scrollTop = startScrollTop + distance * easedProgress;

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				isScrolling = false;
			}
		}

		requestAnimationFrame(animate);
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
		visibleCount = Math.min(visibleCount + 50, sortedEntries.length);
		isLoading = false;
	}

	// Reset visible count when filtered entries change
	$effect(() => {
		if (sortedEntries.length > 0) {
			visibleCount = Math.min(50, sortedEntries.length);
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

	// Clear search
	function clearSearch() {
		searchQuery = '';
		searchField = 'all';
	}

	// Handle column sorting
	function handleSort(field: 'timestamp' | 'level' | 'channel' | 'status' | 'message') {
		if (sortField === field) {
			// Toggle direction if same field
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// Set new field with default direction
			sortField = field;
			sortDirection = 'asc';
		}
	}

	// Get sort indicator for a column
	function getSortIndicator(field: 'timestamp' | 'level' | 'channel' | 'status' | 'message') {
		if (sortField !== field) return '↕';
		return sortDirection === 'asc' ? '↑' : '↓';
	}
</script>

<div
	class="log-table-container overflow-hidden rounded-xl"
	style="background-color: var(--color-bg-secondary);"
>
	<!-- Header with Search -->
	<div
		class="border-b px-6 py-4"
		style="border-color: var(--color-border); background-color: var(--color-bg-tertiary);"
	>
		<div
			class="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
		>
			<div class="flex items-center space-x-3">
				<h3 class="text-base font-semibold" style="color: var(--color-text-primary);">
					Log Entries
				</h3>
				{#if searchQuery}
					<span class="text-xs" style="color: var(--color-text-secondary);">
						({visibleEntries.length} of {searchFilteredEntries.length} results)
					</span>
				{/if}
			</div>

			<!-- Search Controls -->
			<div class="flex items-center space-x-2">
				<!-- Search Field Selector -->
				<select
					bind:value={searchField}
					class="h-8 rounded-lg border-0 px-3 text-xs shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
					style="background-color: var(--color-bg-secondary); color: var(--color-text-primary);"
				>
					<option value="all">All Fields</option>
					<option value="message">Message</option>
					<option value="channel">Channel</option>
					<option value="threadId">Thread ID</option>
				</select>

				<!-- Search Input -->
				<div class="relative">
					<input
						bind:value={searchQuery}
						type="text"
						placeholder="Search logs..."
						class="h-8 w-48 rounded-lg border-0 pr-8 pl-8 text-xs shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
						style="background-color: var(--color-bg-secondary); color: var(--color-text-primary);"
					/>
					<!-- Search Icon -->
					<div class="absolute top-1/2 left-2.5 -translate-y-1/2">
						<svg
							class="h-3 w-3 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
					<!-- Clear Button -->
					{#if searchQuery}
						<button
							onclick={clearSearch}
							class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					{/if}
				</div>

				<!-- Total Count -->
				<span class="text-xs" style="color: var(--color-text-secondary);">
					Total: {effectiveEntries.length}
				</span>
			</div>
		</div>
	</div>

	<!-- Table with max height and scroll -->
	<div class="overflow-hidden" style="height: 500px;">
		{#if effectiveEntries.length > 0}
			<div
				bind:this={tableContainer}
				onscroll={handleScroll}
				class="h-full overflow-x-auto overflow-y-auto"
			>
				<table class="min-w-full divide-y" style="border-color: var(--color-border);">
					<thead>
						<tr>
							<th class="w-12 px-4 py-2" style="background-color: var(--color-bg-tertiary);"></th>
							<th
								onclick={() => handleSort('timestamp')}
								class="cursor-pointer px-4 py-2 text-left text-xs font-medium tracking-wider uppercase transition-colors"
								style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);"
							>
								Time {getSortIndicator('timestamp')}
							</th>
							<th
								onclick={() => handleSort('level')}
								class="cursor-pointer px-4 py-2 text-left text-xs font-medium tracking-wider uppercase transition-colors"
								style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);"
							>
								Level {getSortIndicator('level')}
							</th>
							<th
								onclick={() => handleSort('channel')}
								class="cursor-pointer px-4 py-2 text-left text-xs font-medium tracking-wider uppercase transition-colors"
								style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);"
							>
								Channel {getSortIndicator('channel')}
							</th>
							<th
								onclick={() => handleSort('status')}
								class="cursor-pointer px-4 py-2 text-left text-xs font-medium tracking-wider uppercase transition-colors"
								style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);"
							>
								Status {getSortIndicator('status')}
							</th>
							<th
								onclick={() => handleSort('message')}
								class="cursor-pointer px-4 py-2 text-left text-xs font-medium tracking-wider uppercase transition-colors"
								style="background-color: var(--color-bg-tertiary); color: var(--color-text-secondary);"
							>
								Message {getSortIndicator('message')}
							</th>
						</tr>
					</thead>
					<tbody
						class="divide-y"
						style="border-color: var(--color-border); background-color: var(--color-bg-secondary);"
					>
						{#each visibleEntries as log, index}
							<tr
								class="transition-colors duration-150"
								style="--hover-bg: var(--color-bg-tertiary);"
							>
								<td class="px-4 py-3 whitespace-nowrap">
									<button
										onclick={() => toggleRow(log.id)}
										class="inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors"
										style="background-color: transparent;"
										aria-label={isExpanded(log.id) ? 'Collapse row' : 'Expand row'}
										title={isExpanded(log.id) ? 'Collapse' : 'Expand'}
									>
										{#if isExpanded(log.id)}
											<span class="text-sm" style="color: var(--color-text-secondary);">−</span>
										{:else}
											<span class="text-sm" style="color: var(--color-text-secondary);">+</span>
										{/if}
									</button>
								</td>
								<td
									class="px-4 py-3 font-mono text-sm whitespace-nowrap"
									style="color: var(--color-text-primary);"
								>
									{formatTime(log.timestamp)}
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {levelStyles[
											log.level as keyof typeof levelStyles
										]?.bg} {levelStyles[log.level as keyof typeof levelStyles]?.text}"
									>
										{log.level}
									</span>
								</td>
								<td
									class="px-4 py-3 text-sm font-medium whitespace-nowrap"
									style="color: var(--color-text-primary);"
								>
									{log.channel || '—'}
								</td>
								<td class="px-4 py-3 whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {log.status ===
										'ERROR'
											? 'bg-red-100 text-red-700'
											: log.status === 'RECEIVED'
												? 'bg-blue-100 text-blue-700'
												: log.status === 'SENT'
													? 'bg-green-100 text-green-700'
													: 'bg-gray-100 text-gray-700'}"
									>
										{log.status || '—'}
									</span>
								</td>
								<td class="px-4 py-3 text-sm" style="color: var(--color-text-primary);">
									<div
										class="max-w-lg {isExpanded(log.id) ? '' : 'truncate'}"
										title={isExpanded(log.id) ? '' : log.message}
									>
										{log.message}
									</div>
								</td>
							</tr>
							{#if isExpanded(log.id)}
								<tr style="background-color: var(--color-bg-tertiary);" data-log-id={log.id}>
									<td></td>
									<td colspan="5" class="px-4 py-3">
										<MessageDetailsTabs {log} />
									</td>
								</tr>
							{/if}
						{/each}

						<!-- Loading indicator -->
						{#if isLoading}
							<tr>
								<td colspan="6" class="px-4 py-3 text-center">
									<div
										class="flex items-center justify-center space-x-2"
										style="color: var(--color-text-secondary);"
									>
										<div
											class="h-4 w-4 animate-spin rounded-full border-2"
											style="border-color: var(--color-border); border-top-color: var(--color-accent);"
										></div>
										<span class="text-sm">Loading more entries...</span>
									</div>
								</td>
							</tr>
						{/if}

						<!-- Load more button -->
						{#if hasMoreEntries && !isLoading}
							<tr>
								<td colspan="6" class="px-4 py-3 text-center">
									<button
										onclick={loadMore}
										class="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800"
									>
										Load More ({sortedEntries.length - visibleEntries.length} remaining)
									</button>
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		{:else}
			<!-- Empty state placeholder -->
			<div
				class="flex h-full items-center justify-center"
				style="background-color: var(--color-bg-tertiary);"
			>
				<div class="text-center">
					<div class="mb-4 text-6xl" style="color: var(--color-border);">
						{searchQuery ? '🔍' : '📋'}
					</div>
					<h3 class="mb-2 text-lg font-medium" style="color: var(--color-text-primary);">
						{searchQuery ? 'No search results found' : 'No log data available'}
					</h3>
					<p class="text-sm" style="color: var(--color-text-secondary);">
						{searchQuery
							? `No logs match "${searchQuery}" in ${searchField === 'all' ? 'any field' : searchField}`
							: 'No log entries are currently available for the selected criteria'}
					</p>
					{#if searchQuery}
						<button
							onclick={clearSearch}
							class="mt-3 inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors"
							style="background-color: var(--color-accent);"
						>
							Clear Search
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
