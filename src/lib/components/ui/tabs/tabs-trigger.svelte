<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { getContext } from 'svelte';
    let { class: className = '', value, children = undefined } = $props<{ value: string }>();

	type Ctx = { current: string | null; setValue: (v: string) => void };
	const ctx = getContext<Ctx | undefined>('bb-tabs');
	const selected = $derived((ctx?.current ?? null) === value);
</script>

<button
	type="button"
	class={cn(
		'-mb-px border-b-2 px-3 py-2 text-sm font-medium',
		selected
			? 'border-primary text-primary'
			: 'text-muted-foreground hover:text-foreground border-transparent',
		className
	)}
	aria-selected={selected}
	role="tab"
	on:click={() => ctx?.setValue?.(value)}
>
	{@render children?.()}
</button>
