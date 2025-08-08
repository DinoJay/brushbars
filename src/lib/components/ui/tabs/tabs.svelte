<script lang="ts">
	import { createEventDispatcher, setContext } from 'svelte';
	import { cn } from '$lib/utils.js';

	type TabsValue = string;

	let {
		class: className = '',
		value = $bindable<TabsValue | null>(null),
		defaultValue = null as TabsValue | null,
		orientation = 'horizontal' as 'horizontal' | 'vertical',
		activationMode = 'automatic' as 'automatic' | 'manual',
		children = undefined
	} = $props();

	const dispatch = createEventDispatcher<{ change: TabsValue }>();

	if (value === null && defaultValue !== null) {
		value = defaultValue;
	}

	function setValue(next: TabsValue) {
		value = next;
		dispatch('change', next);
	}

	// Provide context for descendants
	const ctx = {
		get current() {
			return value;
		},
		setValue
	};
	setContext('bb-tabs', ctx);
</script>

<div data-slot="tabs" class={cn('', className)} data-orientation={orientation}>
	{@render children?.({ value, setValue, activationMode, orientation })}
</div>
