<!-- runes -->
<script lang="ts">
	import MessagesWrapper from '../../MessagesWrapper.svelte';
	import type { PageData } from './$types';

	const props = $props<{ data: PageData }>();
	export const ssr = false;
</script>

<MessagesWrapper {...props} />
