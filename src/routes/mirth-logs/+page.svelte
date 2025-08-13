<!-- runes -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect to dashboard logs subroute with today's date
		const today = new Date().toISOString().split('T')[0];
		goto(`/mirth-logs/logs?day=${today}`);
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
		<p class="text-gray-600">Redirecting to logs...</p>
	</div>
</div>
