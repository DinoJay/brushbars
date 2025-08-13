<script lang="ts">
	import DevLogsWrapper from '../DevLogsWrapper.svelte';
	import { logStore } from '$stores/logStore.svelte';
	import type { PageData } from './$types';

	const props = $props<{ data: PageData }>();

	// Apply server-provided logs only when the day changes
	let appliedForDay = $state<string | null>(null);
	$effect(() => {
		const day = props.data?.day as string | undefined;
		if (props.data?.success && day && Array.isArray(props.data.logs) && appliedForDay !== day) {
			appliedForDay = day;
			logStore.updateDevLogs(props.data.logs);
		}
	});
</script>

<DevLogsWrapper loading={false} />
