<script lang="ts">
	interface $$Props {
		value: string;
		selected?: boolean;
		class?: string;
	}

	let { value, selected = false, class: className = '' }: $$Props = $props();
</script>

<button
	class="relative rounded-lg px-5 py-3 text-sm font-medium transition-all duration-200 {className}"
	class:selected
	style="
		{selected
		? 'background-color: var(--color-accent); color: white; box-shadow: var(--shadow-md);'
		: 'background-color: transparent; color: var(--color-text-secondary);'}
	"
>
	<slot />
</button>
