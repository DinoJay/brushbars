<script>
	import { logStore } from './logStore.svelte.ts';
</script>

<h2 class="mb-2 text-lg font-semibold">Log Table</h2>
<div class="overflow-x-auto">
	<table class="min-w-full border border-gray-200 text-sm">
		<thead class="bg-gray-100 text-gray-700">
			<tr>
				<th class="border-b px-3 py-2 text-left">Timestamp</th>
				<th class="border-b px-3 py-2 text-left">Channel</th>
				<th class="border-b px-3 py-2 text-left">Level</th>
				<th class="border-b px-3 py-2 text-left">Message</th>
			</tr>
		</thead>
		<tbody>
			{#each logStore.filteredEntries as log}
				<tr class="border-b hover:bg-gray-50">
					<td class="px-3 py-1">{log.timestamp}</td>
					<td class="px-3 py-1">{log.channel}</td>
					<td class="px-3 py-1">{log.level}</td>
					<td class="px-3 py-1">{log.message}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
