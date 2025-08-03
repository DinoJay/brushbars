<!-- runes -->
<script>
	import { selectedLevel } from '../logStore.js';

	function clearFilter() {
		selectedLevel.set(null);
	}

	function getLevelColor(level) {
		switch (level) {
			case 'ERROR':
				return '#dc2626';
			case 'WARN':
				return '#facc15';
			case 'INFO':
				return '#16a34a';
			case 'DEBUG':
				return '#64748b';
			default:
				return '#3b82f6';
		}
	}
</script>

{#if $selectedLevel}
	<div class="mb-4 flex items-center gap-2">
		<span class="text-sm text-gray-600">Filtered by:</span>
		<div
			class="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white"
			style="background-color: {getLevelColor($selectedLevel)}"
		>
			<span>{$selectedLevel}</span>
			<button
				onclick={clearFilter}
				class="bg-opacity-20 hover:bg-opacity-30 ml-1 rounded-full bg-white p-1 transition-all duration-200"
			>
				×
			</button>
		</div>
	</div>
{/if}
