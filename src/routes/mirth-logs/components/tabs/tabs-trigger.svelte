<script lang="ts">
	import { cn } from '$lib/utils';
	import { getContext } from 'svelte';
	let { class: className = '', value } = $props<{ value: string }>();

	type Ctx = { current: string | null; setValue: (v: string) => void };
	const ctx = getContext<Ctx | undefined>('bb-tabs');
	const selected = $derived((ctx?.current ?? null) === value);
</script>

<button
	type="button"
	class={cn(
		'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
		selected ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100',
		className
	)}
	aria-selected={selected}
	role="tab"
	onclick={() => ctx?.setValue?.(value)}
>
	<slot />
</button>
