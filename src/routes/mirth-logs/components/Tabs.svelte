<!-- runes -->
<script>
	const { tabs, activeTab, onTabChange } = $props();
</script>

<div class="border-b border-gray-200">
	<nav class="-mb-px flex space-x-8" aria-label="Tabs">
		{#each tabs as tab}
			<button
				class="group relative min-w-0 flex-1 overflow-hidden px-1 py-4 text-center text-sm font-medium hover:text-gray-700 focus:z-10 focus:outline-none {activeTab ===
				tab.id
					? 'border-b-2 border-blue-500 text-blue-600'
					: 'border-b-2 border-transparent text-gray-500 hover:border-gray-300'}"
				onclick={() => onTabChange(tab.id)}
			>
				<span class="flex items-center justify-center gap-2">
					{#if tab.icon}
						<span class="text-lg">{tab.icon}</span>
					{/if}
					{tab.label}
				</span>
				{#if activeTab === tab.id}
					<span class="absolute inset-x-0 -bottom-px h-px bg-blue-500" aria-hidden="true"></span>
				{/if}
			</button>
		{/each}
	</nav>
</div>
