<script lang="ts">
	import { cn } from '$lib/utils';
	let { class: className = '' } = $props();
</script>

<div
	data-slot="tabs-list"
	class={cn(
		'flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm',
		className
	)}
>
	<slot />
</div>
