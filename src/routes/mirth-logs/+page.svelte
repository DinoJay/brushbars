<script lang="ts">
	import { closeLogSocket, initLogSocket } from '$lib/websocketClient';
	import { logStore } from '../../stores/logStore.svelte';
	import Tabs from './components/Tabs.svelte';
	import LogsView from './components/LogsView.svelte';
	import Messages from './components/Messages.svelte';

	// Tab state
	let activeTab = $state('logs');

	// Tab configuration
	const tabs = [
		{ id: 'logs', label: 'Logs', icon: '📋' },
		{ id: 'messages', label: 'Messages', icon: '📨' }
	];

	function handleTabChange(tabId) {
		activeTab = tabId;
	}

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
	<h1 class="mb-4 text-2xl font-bold">📋 📡 Mirth Dashboard</h1>

	<!-- Tabs -->
	<div class="mb-6 rounded bg-white p-4 shadow">
		<Tabs {tabs} {activeTab} onTabChange={handleTabChange} />
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'logs'}
		<LogsView />
	{:else if activeTab === 'messages'}
		<div class="rounded bg-white p-4 shadow">
			<Messages />
		</div>
	{/if}
</main>
