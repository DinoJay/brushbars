<!-- runes -->
<script>
	import MirthActivityTimeline from '../MirthActivityTimeline.svelte';
	import LogTable from '../LogTable.svelte';
	import LogFilters from './LogFilters.svelte';
	import DayButtons from './DayButtons.svelte';
</script>

<!-- Day Selection -->
<div class="mb-6 rounded bg-white p-4 shadow">
	<DayButtons />
</div>

<!-- Filters -->
<LogFilters />

<div class="mb-6 rounded bg-white p-4 shadow">
	<MirthActivityTimeline />
</div>
<div class="rounded bg-white p-4 shadow">
	<LogTable />
</div>
