<!-- runes -->
<script>
	import { logStore } from '../../stores/logStore.svelte';

	const { onUnitChange = () => {} } = $props();
</script>

<div class="mb-4">
	<div class="flex gap-1">
		{#each Object.keys(logStore.rounders) as unit}
			<button
				class="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105
					{logStore.groupUnit === unit
					? 'bg-blue-600 text-white shadow-md'
					: 'border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				onclick={() => {
					logStore.setGroupUnit(unit);
					onUnitChange(unit);
				}}
			>
				{unit.charAt(0).toUpperCase() + unit.slice(1)}
			</button>
		{/each}
	</div>
</div>
