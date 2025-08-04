<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient';
	import ActivityTimeline from './ActivityTimeline.svelte';
	import { logStore } from '../stores/logStore.svelte';
	import LogTable from './LogTable.svelte';
	import LogFilters from './components/LogFilters.svelte';

	$effect(() => {
		// Initialize WebSocket connection

		initLogSocket(
			// onLogFull callback - when all historical logs are received
			(parsedLogs) => {
				console.log('📊 Received historical logs:', parsedLogs.length, 'entries');

				// Update the log store with the received logs
				logStore.updateEntries(parsedLogs);
			},
			// onLogUpdate callback - when new logs arrive
			(parsedLogs) => {
				console.log('📝 Received log updates:', parsedLogs.length, 'entries');

				// Add new logs to existing ones
				const currentEntries = logStore.entries;
				logStore.updateEntries([...currentEntries, ...parsedLogs]);
			}
		);

		// Cleanup function
		return () => {
			closeLogSocket();
		};
	});
</script>

<main class="min-h-screen bg-gray-50 p-6 font-sans">
	<h1 class="mb-4 text-2xl font-bold">📋 Mirth Log Dashboard</h1>

	<!-- Filters -->
	<LogFilters />

	<div class="mb-6 rounded bg-white p-4 shadow">
		<ActivityTimeline />
	</div>
	<div class="rounded bg-white p-4 shadow">
		<LogTable />
	</div>
</main>
