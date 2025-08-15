<!-- runes -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { logStore } from '$stores/logStore.svelte';
	import DayButtons from '../components/DayButtons.svelte';
	import LoadingSpinner from '../components/LoadingSpinner.svelte';
	import type { LayoutData } from './$types';

	const props = $props<{ data: LayoutData; children?: any }>();

	// Selected day: show immediate highlight on click using a local pending value
	const urlSelectedDay = $derived.by(() => $page.url.searchParams.get('day'));
	let pendingSelectedDay = $state<string | null>(null);
	const selectedDay = $derived.by(() => pendingSelectedDay ?? urlSelectedDay);

	// Clear pending once URL reflects the selection
	$effect(() => {
		if (pendingSelectedDay && urlSelectedDay === pendingSelectedDay) {
			pendingSelectedDay = null;
		}
	});

	// Detect tab switches (logs ↔ channels) without timeouts
	const currentTab = $derived.by(() => {
		const p = $page.url.pathname;
		if (p.includes('/logs')) return 'logs';
		if (p.includes('/channels')) return 'channels';
		return '';
	});

	// Store resolved days data to prevent re-running promises
	let resolvedDevLogsDays = $state<any[]>([]);
	let resolvedMessageDays = $state<any[]>([]);
	let resolvedDevLogsForDay = $state<any[]>([]);
	let resolvedMessagesForDay = $state<any[]>([]);
	let daysDataLoaded = $state(false);
	let dayDataLoaded = $state(false);

	// Initialize store with data from layout.ts
	$effect(() => {
		if (props.data?.success && !daysDataLoaded) {
			console.log('🔄 Dashboard layout: Initializing store with streaming promises');
			loadDaysData();
		}
	});

	// Load days data once and store it
	async function loadDaysData() {
		try {
			if (props.data?.devLogsDaysPromise && props.data?.messageDaysPromise) {
				const [devLogsDays, messageDays] = await Promise.all([
					props.data.devLogsDaysPromise,
					props.data.messageDaysPromise
				]);

				resolvedDevLogsDays = devLogsDays || [];
				resolvedMessageDays = messageDays || [];
				daysDataLoaded = true;
				console.log('✅ Dashboard layout: Days data loaded and stored');
			}
		} catch (error) {
			console.error('❌ Dashboard layout: Failed to load days data:', error);
			daysDataLoaded = true; // Mark as loaded even on error
		}
	}

	// Handle day selection
	async function handleSelectDay(date: string) {
		// Update local pending selection immediately for instant highlight
		pendingSelectedDay = date;

		// Create new URL object with day parameter (immutable)
		const currentUrl = new URL(window.location.href);
		const newUrl = new URL(currentUrl);
		newUrl.searchParams.set('day', date);

		// Use replaceState for immediate URL update
		window.history.replaceState({}, '', newUrl.toString());

		// Also trigger navigation but don't wait for it
		goto(newUrl.pathname + '?' + newUrl.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});

		// Clear filters and brush immediately on day change
		logStore.setSelectedLevel(null);
		logStore.setSelectedChannel(null);
		logStore.setSelectedRange(null);
	}
</script>

<!-- Day Buttons Section - Visible within a tab -->
<div
	class="mb-4 flex overflow-auto rounded p-3"
	style="background-color: var(--color-bg-secondary);"
>
	<!-- Debug info -->
	<div class="mb-2 text-xs text-gray-500">
		Current tab: {currentTab} | Selected day: {selectedDay} | Has data: {Boolean(props.data)}
	</div>

	<div class="flex overflow-auto">
		{#if !daysDataLoaded}
			<!-- Loading spinner for day buttons -->
			<div class="flex w-full items-center justify-center py-8">
				<LoadingSpinner label="Loading day buttons..." size={32} />
			</div>
		{:else}
			<!-- Day buttons are always visible once data is loaded -->
			<DayButtons
				{selectedDay}
				days={currentTab === 'logs' ? resolvedDevLogsDays : resolvedMessageDays}
				loading={false}
				error={null}
				onSelectDay={handleSelectDay}
				type={currentTab === 'logs' ? 'devLogs' : 'messages'}
			/>
		{/if}
	</div>
</div>

<!-- Main Content Area -->
{@render props.children?.()}
