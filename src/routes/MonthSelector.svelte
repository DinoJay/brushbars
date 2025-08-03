<!-- runes -->
<script>
	import { selectedMonth, availableMonths, monthFilteredEntries } from './logStore.js';

	function formatMonthLabel(month) {
		if (month === 'all') return 'All Months';

		const [year, monthNum] = month.split('-');
		const date = new Date(parseInt(year), parseInt(monthNum) - 1);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
	}

	function getMonthIcon(month) {
		if (month === 'all') return '📊';

		const [year, monthNum] = month.split('-');
		const monthInt = parseInt(monthNum);

		// Seasonal icons based on month
		if (monthInt >= 12 || monthInt <= 2) return '❄️'; // Winter
		if (monthInt >= 3 && monthInt <= 5) return '🌸'; // Spring
		if (monthInt >= 6 && monthInt <= 8) return '☀️'; // Summer
		if (monthInt >= 9 && monthInt <= 11) return '🍂'; // Fall

		return '📅';
	}
</script>

<div class="mb-6">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-800">Data Filter</h3>
		<div class="text-sm text-gray-500">
			{$monthFilteredEntries.length} logs available
		</div>
	</div>

	<!-- Month Selection Buttons -->
	<div class="flex flex-wrap gap-2">
		{#each $availableMonths as month}
			<button
				onclick={() => selectedMonth.set(month)}
				class="group relative flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95
					{$selectedMonth === month
					? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
					: 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'}"
			>
				<span class="text-base">{getMonthIcon(month)}</span>
				<span>{formatMonthLabel(month)}</span>

				{#if $selectedMonth === month}
					<div class="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500"></div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Quick Stats -->
	<div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-lg bg-gray-50 p-3 text-center">
			<div class="text-lg font-bold text-gray-800">{$monthFilteredEntries.length}</div>
			<div class="text-xs text-gray-600">Total Logs</div>
		</div>
		<div class="rounded-lg bg-gray-50 p-3 text-center">
			<div class="text-lg font-bold text-red-600">
				{$monthFilteredEntries.filter((e) => e.level === 'ERROR').length}
			</div>
			<div class="text-xs text-gray-600">Errors</div>
		</div>
		<div class="rounded-lg bg-gray-50 p-3 text-center">
			<div class="text-lg font-bold text-yellow-600">
				{$monthFilteredEntries.filter((e) => e.level === 'WARN').length}
			</div>
			<div class="text-xs text-gray-600">Warnings</div>
		</div>
		<div class="rounded-lg bg-gray-50 p-3 text-center">
			<div class="text-lg font-bold text-green-600">
				{$monthFilteredEntries.filter((e) => e.level === 'INFO').length}
			</div>
			<div class="text-xs text-gray-600">Info</div>
		</div>
	</div>
</div>
