<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	let {
		class: className = '',
		value,
		children
	} = $props<{ value: string; class?: string; children?: any }>();

	type Ctx = { current: string | null };
	const ctx = getContext<Ctx | undefined>('bb-tabs');
	const hidden = $derived((ctx?.current ?? null) !== value);
</script>

{#if !hidden}
	<div data-slot="tabs-content" class={cn(className)} role="tabpanel">
		{@render children?.()}
	</div>
{/if}
