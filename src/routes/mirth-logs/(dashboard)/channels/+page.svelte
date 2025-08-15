<!-- runes -->
<script lang="ts">
	import MessagesWrapper from '../../MessagesWrapper.svelte';
	import type { PageData } from './$types';

	const props = $props<{ data: PageData }>();
</script>

<MessagesWrapper data={props.data} />
