<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient';
	import MirthActivityTimeline from './MirthActivityTimeline.svelte';
	import { logStore } from '../../stores/logStore.svelte';
	import LogTable from './LogTable.svelte';
	import LogFilters from './components/LogFilters.svelte';
	import DayButtons from './components/DayButtons.svelte';

	$effect(() => {
		// Initialize WebSocket connection

		initLogSocket(
			// onLogFull callback - when all historical logs are received
			(parsedLogs: any[]) => {
				console.log('📊 Received historical logs:', parsedLogs.length, 'entries');

				// Update the WebSocket entries with the received logs
				logStore.updateWebsocketEntries(parsedLogs);
			},
			// onLogUpdate callback - when new logs arrive
			(parsedLogs: any[]) => {
				console.log('📝 Received log updates:', parsedLogs.length, 'entries');

				// Add new logs to existing WebSocket entries
				const currentWebsocketEntries = logStore.websocketEntries;
				logStore.updateWebsocketEntries([...currentWebsocketEntries, ...parsedLogs]);
			}
		);

		// Cleanup function
		return () => {
			closeLogSocket();
		};
	});
</script>

<main class="min-h-screen bg-gray-50 p-6 font-sans">
	<h1 class="mb-4 text-2xl font-bold">📋 📡 Mirth Log Dashboard</h1>

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
</main>
