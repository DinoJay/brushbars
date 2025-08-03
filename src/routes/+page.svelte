<script lang="ts">
	import ActivityTimeline from './ActivityTimeline.svelte';
	import LogTable from './LogTable.svelte';
	import MonthSelector from './MonthSelector.svelte';
</script>

<main class="min-h-screen bg-gray-50 p-6 font-sans">
	<h1 class="mb-4 text-2xl font-bold">📋 Mirth Log Dashboard</h1>

	<!-- Month Selector -->
	<div class="mb-4 rounded bg-white p-4 shadow">
		<MonthSelector />
	</div>

	<div class="mb-6 rounded bg-white p-4 shadow">
		<ActivityTimeline />
	</div>
	<div class="rounded bg-white p-4 shadow">
		<LogTable />
	</div>
</main>
