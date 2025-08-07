<!-- runes -->
<script>
	import { logStore } from '../../stores/logStore.svelte';
	import ActivityTimeline from './ActivityTimeline.svelte';

	function handleRangeChange(range) {
		logStore.setSelectedRange(range);
	}
</script>

<ActivityTimeline
	data={logStore.grouped}
	groupUnit={logStore.groupUnit}
	onRangeChange={handleRangeChange}
/>
