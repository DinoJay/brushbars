<script lang="ts">
	const props = $props<{ label?: string; size?: number; class?: string }>();
	const label = props.label ?? 'Loading…';
	const size = props.size ?? 40; // px
</script>

<div class={`text-center ${props.class ?? ''}`} aria-live="polite" aria-busy="true">
	<div
		class="mx-auto mb-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
		style={`width:${size}px; height:${size}px;`}
	></div>
	{#if label}
		<p class="text-sm" style="color: var(--color-text-secondary);">{label}</p>
	{/if}
</div>
