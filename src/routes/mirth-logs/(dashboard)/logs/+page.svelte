<!-- runes -->
<script lang="ts">
	import DevLogsWrapper from '../../DevLogsWrapper.svelte';
	import type { PageData } from './$types';

	const props = $props<{ data: PageData }>();
	export const ssr = false;
</script>

<DevLogsWrapper data={props.data} />
