<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	let { class: className = '', value } = $props<{ value: string }>();

	type Ctx = { current: string | null };
	const ctx = getContext<Ctx | undefined>('bb-tabs');
	const hidden = $derived((ctx?.current ?? null) !== value);
</script>

<div data-slot="tabs-content" class={cn(hidden && 'hidden', className)} role="tabpanel">
	<slot />
</div>
