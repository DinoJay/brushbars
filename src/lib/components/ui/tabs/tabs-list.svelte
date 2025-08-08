<script lang="ts">
	import { cn } from '$lib/utils.js';
    let { class: className = '', children = undefined } = $props();
</script>

<div data-slot="tabs-list" class={cn('flex items-center gap-1 border-b', className)}>
	{@render children?.()}
</div>
