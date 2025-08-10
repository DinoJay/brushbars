<!-- runes -->
<script lang="ts">
	import type { TimelineEntry } from '$lib/types';
	const { entries, selectedRange = null } = $props<{
		entries: TimelineEntry[];
		selectedRange?: [Date, Date] | null;
	}>();
	const effectiveEntries = $derived(entries);
</script>

<div class="overflow-x-auto rounded border border-gray-200 bg-white">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				<th class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
					>Time</th
				>
				<th class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
					>Level</th
				>
				<th class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
					>Channel</th
				>
				<th class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
					>Message</th
				>
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-100 bg-white">
			{#each effectiveEntries as e}
				<tr>
					<td class="px-4 py-2 text-sm whitespace-nowrap text-gray-700"
						>{new Date(e.timestamp as any).toLocaleString()}</td
					>
					<td class="px-4 py-2 text-sm font-semibold whitespace-nowrap text-gray-800">{e.level}</td>
					<td class="px-4 py-2 text-sm whitespace-nowrap text-gray-700">{e.channel}</td>
					<td class="px-4 py-2 text-sm text-gray-700">{e.message}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
