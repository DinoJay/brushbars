<script lang="ts">
	import { goto } from '$app/navigation';
	import { logStore } from '$stores/logStore.svelte';

	let statusText = $state('Loading days...');

	$effect(() => {
		goto(`/mirth-logs/logs?day=$new Date().toISOString().split('T')[0]}`);
	});
</script>

<!-- <div class="bg-gray-25 flex min-h-screen items-center justify-center dark:bg-gray-900">
	<div class="text-center">
		<div
			class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500 dark:border-blue-400"
		></div>
		<p class="text-gray-600 dark:text-gray-300">{statusText}</p>
	</div>
</div> -->
