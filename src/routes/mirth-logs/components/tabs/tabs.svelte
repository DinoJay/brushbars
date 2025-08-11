<script lang="ts">
	import { setContext } from 'svelte';
	import { cn } from '$lib/utils';

	type TabsValue = string;

	let {
		class: className = '',
		value = $bindable<TabsValue | null>(null),
		defaultValue = null as TabsValue | null,
		orientation = 'horizontal' as 'horizontal' | 'vertical',
		activationMode = 'automatic' as 'automatic' | 'manual',
		onChange = undefined as ((value: TabsValue) => void) | undefined,
		children
	} = $props();

	if (value === null && defaultValue !== null) {
		value = defaultValue;
	}

	function setValue(next: TabsValue) {
		value = next;
		onChange?.(next);
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

<div class={cn('', className)} data-orientation={orientation}>
	{@render children?.()}
</div>
