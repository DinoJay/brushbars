<script lang="ts">
	import { getContext } from 'svelte';

	type TabsCtx = {
		current: string | null;
		setValue: (v: string) => void;
	};

	interface $$Props {
		value: string;
		class?: string;
	}

	let { value, class: className = '' }: $$Props = $props();

	const ctx = getContext<TabsCtx | undefined>('bb-tabs');
	const selected = $derived((ctx?.current ?? null) === value);
</script>

<button
	role="tab"
	aria-selected={selected}
	class="relative rounded-lg px-5 py-3 text-sm font-medium transition-all duration-200 {className}"
	data-selected={selected}
	style="
        {selected
		? 'background-color: var(--color-accent); color: white; box-shadow: var(--shadow-md);'
		: 'background-color: transparent; color: var(--color-text-secondary);'}
    "
	onclick={() => ctx?.setValue?.(value)}
>
	<slot />
</button>
