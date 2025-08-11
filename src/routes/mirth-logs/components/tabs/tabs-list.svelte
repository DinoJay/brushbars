<script lang="ts">
	interface $$Props {
		class?: string;
	}

	let { class: className = '' }: $$Props = $props();
</script>

<div
	class="flex items-center gap-1 rounded-xl p-2 {className}"
	style="background-color: var(--color-bg-tertiary); border: 1px solid var(--color-border-light);"
>
	<slot />
</div>
