<!-- runes -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
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
	let lastTab = $state<string | null>(null);
	let isTabChanging = $state(false);
	// Full refresh: show a single global spinner until loader data is hydrated
	let isInitializing = $state(true);

	// When tab changes, mark as changing
	$effect(() => {
		if (lastTab !== null && currentTab && currentTab !== lastTab) {
			isTabChanging = true;
		}
		lastTab = currentTab || lastTab;
	});

	// Clear tab-changing state once navigation completes
	$effect(() => {
		if (isTabChanging && !$navigating) {
			isTabChanging = false;
		}
	});

	// Full-page spinner when tab is changing or no children yet
	// Also consider in-flight navigation target to detect tab switch immediately
	const navToTab = $derived.by(() => {
		const toPath = ($navigating as any)?.to?.url?.pathname as string | undefined;
		if (!toPath) return '';
		if (toPath.includes('/logs')) return 'logs';
		if (toPath.includes('/channels')) return 'channels';
		return '';
	});
	const isTabNav = $derived.by(() => Boolean($navigating && navToTab && navToTab !== currentTab));
	const showFullSpinner = $derived.by(
		() => isInitializing || isTabChanging || isTabNav || !props.children
	);
	// Local fetch-in-progress for day changes
	let isFetchingDay = $state(false);
	// Content-only spinner during day changes/navigation within the same tab
	const showContentSpinner = $derived.by(() => !showFullSpinner && ($navigating || isFetchingDay));

	// Initialize store with data from layout.ts
	$effect(() => {
		if (props.data?.success) {
			console.log('🔄 Dashboard layout: Initializing store with layout data');

			// Update store with days data
			if (props.data.devLogsDays && props.data.devLogsDays.length > 0) {
				logStore.updateDevLogDays(props.data.devLogsDays);
				console.log(
					'✅ Dashboard layout: Store updated with dev log days:',
					props.data.devLogsDays.length
				);
			}

			if (props.data.messageDays && props.data.messageDays.length > 0) {
				logStore.updateMessageDays(props.data.messageDays);
				console.log(
					'✅ Dashboard layout: Store updated with message days:',
					props.data.messageDays.length
				);
			}

			// Hydrate current day's entries into the store if provided by loader
			if (
				Array.isArray((props.data as any).devLogsForDay) &&
				(props.data as any).devLogsForDay.length
			) {
				logStore.updateDevLogs((props.data as any).devLogsForDay as any);
				console.log('✅ Dashboard layout: Hydrated dev logs for selected day');
			}
			if (
				Array.isArray((props.data as any).messagesForDay) &&
				(props.data as any).messagesForDay.length
			) {
				logStore.updateMessages((props.data as any).messagesForDay as any);
				console.log('✅ Dashboard layout: Hydrated messages for selected day');
			}
			// Mark initialization complete once hydrated
			isInitializing = false;
		}
	});

	// Handle day selection
	async function handleSelectDay(date: string) {
		// Update local pending selection immediately for instant highlight
		pendingSelectedDay = date;
		// Update URL directly
		const url = new URL(window.location.href);
		url.searchParams.set('day', date);
		await goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});

		// Clear filters and brush immediately on day change
		logStore.setSelectedLevel(null);
		logStore.setSelectedChannel(null);
		logStore.setSelectedRange(null);

		// Fetch data for the selected day for the active tab
	}
</script>

{#if showFullSpinner}
	<!-- Full-page spinner (hide day buttons) on tab change or initial mount -->
	<LoadingSpinner class="m-auto" label="Loading..." size={56} />
{:else}
	<!-- Day Buttons Section - Visible within a tab -->
	<div
		class="mb-4 flex overflow-auto rounded p-3 shadow"
		style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
	>
		<div class="flex overflow-auto">
			<DayButtons
				{selectedDay}
				days={currentTab === 'logs' ? logStore.devLogDays : logStore.messageDays}
				loading={logStore.loadingDays}
				error={logStore.errorDays}
				onSelectDay={handleSelectDay}
				type={currentTab === 'logs' ? 'devLogs' : 'messages'}
			/>
		</div>
	</div>

	<!-- Main Content Area (spinner only for day changes) -->
	{#if showContentSpinner}
		<LoadingSpinner class="m-auto" label="Loading..." size={48} />
	{:else}
		{@render props.children?.()}
	{/if}
{/if}
