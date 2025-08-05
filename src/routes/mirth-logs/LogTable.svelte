<script>
	import { logStore } from '../../stores/logStore.svelte';

	// Track expanded rows
	let expandedRows = $state(new Set());

	// Level styling
	const levelStyles = {
		ERROR: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🔴' },
		WARN: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '🟡' },
		INFO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '' },
		DEBUG: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '⚪' }
	};

	function formatTime(timestamp) {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function toggleRow(logId) {
		if (expandedRows.has(logId)) {
			expandedRows.delete(logId);
		} else {
			expandedRows.add(logId);
		}
		expandedRows = new Set(expandedRows); // Trigger reactivity
	}

	function isExpanded(logId) {
		return expandedRows.has(logId);
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	<!-- Header -->
	<div class="border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900">Log Entries</h3>
			<div class="flex items-center space-x-4 text-sm text-gray-500">
				<span>{logStore.filteredEntries.length} entries</span>
				{#if logStore.selectedRange}
					<span
						class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
					>
						Filtered
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Table -->
	<div class="overflow-hidden">
		{#if logStore.filteredEntries.length > 0}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="w-12 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							></th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Time</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Level</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Channel</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Message</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100 bg-white">
						{#each logStore.filteredEntries as log, index}
							<tr class="transition-colors duration-150 hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<button
										on:click={() => toggleRow(log.id)}
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
											log.level
										]?.bg} {levelStyles[log.level]?.text} {levelStyles[log.level]?.border}"
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
					</tbody>
				</table>
			</div>
		{:else}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl text-gray-400">📋</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">No logs found</h3>
				<p class="text-gray-500">
					{#if logStore.selectedRange}
						Try adjusting the time range selection
					{:else}
						No log data available
					{/if}
				</p>
			</div>
		{/if}
	</div>
</div>
