<!-- runes -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { logStore } from '$stores/logStore.svelte';
	import LoadingSpinner from '../components/LoadingSpinner.svelte';
	import DayButtons from '../components/DayButtons.svelte';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	export const ssr = false;
	const props = $props<{ data: LayoutData; children?: any }>();

	// Get current tab from URL - more stable detection
	const currentTab = $derived.by(() => {
		const p = $page.url.pathname;
		if (p.includes('/logs')) return 'logs';
		if (p.includes('/channels')) return 'channels';
		return '';
	});

	// Track selected day with state that gets updated when URL changes

	// Debug effect to track selectedDay changes

	// Sync state with URL changes (for browser navigation, etc.)
	// $effect(() => {
	// 	const urlDay = $page.url.searchParams.get('day');
	// 	if (urlDay && urlDay !== currentSelectedDay) {
	// 		currentSelectedDay = urlDay;
	// 		console.log('🔄 Dashboard layout: State synced with URL:', urlDay);
	// 	}
	// });

	// Day buttons data - load only what's needed for current tab
	let dayButtonsData = $state<{ devLogsDays: any[]; messageDays: any[] } | null>(null);
	let isLoadingDayButtons = $state(false);

	// Load day buttons data only for current tab
	async function loadDayButtonsData(route: string) {
		console.log('🔄 Dashboard layout: Loading day buttons data for route:', route);
		isLoadingDayButtons = true;

		try {
			let newData = { ...dayButtonsData } || { devLogsDays: [], messageDays: [] };

			if (route === 'logs') {
				// Load only devLogs data for logs tab
				const response = await fetch('/mirth-logs/api/devLogs/days');
				const data = await response.json();
				newData.devLogsDays = data.days || [];
				console.log('✅ Dashboard layout: DevLogs data loaded for logs tab');
			} else if (route === 'channels') {
				// Load only messages data for channels tab
				const response = await fetch('/mirth-logs/api/messages/days');
				const data = await response.json();
				newData.messageDays = data.days || [];
				console.log('✅ Dashboard layout: Messages data loaded for channels tab');
			}

			dayButtonsData = newData;
			console.log('✅ Dashboard layout: Day buttons data loaded for route:', route);
		} catch (error) {
			console.error('❌ Dashboard layout: Failed to load day buttons data:', error);
			// Keep existing data for other tab if available
			if (!dayButtonsData) {
				dayButtonsData = { devLogsDays: [], messageDays: [] };
			}
		} finally {
			isLoadingDayButtons = false;
		}
	}

	// Watch for route changes and load data
	let lastPathname = $state<string>('');
	$effect(() => {
		const currentPathname = $page.url.pathname;
		if (currentPathname !== lastPathname) {
			lastPathname = currentPathname;
			const route = currentTab;
			if (route) {
				console.log('🔄 Dashboard layout: Pathname changed, loading data for route:', route);
				loadDayButtonsData(route);
			}
		}
	});

	// Watch for day parameter changes and redirect to latest if needed
	$effect(() => {
		const currentDay = $page.url.searchParams.get('day');
		const route = currentTab;

		if (route && dayButtonsData) {
			const availableDays =
				route === 'logs' ? dayButtonsData.devLogsDays : dayButtonsData.messageDays;

			// // Check if day param is empty or not in available days
			// const isDayValid = currentDay && availableDays.some((day) => day.date === currentDay);

			// if (!isDayValid && availableDays.length > 0) {
			// 	// Redirect to latest available day
			// 	const latestDay = availableDays[availableDays.length - 1].date;
			// 	const url = new URL($page.url);
			// 	url.searchParams.set('day', latestDay);
			// 	goto(url.toString(), {
			// 		replaceState: true,
			// 		noScroll: true,
			// 		keepFocus: true,
			// 		invalidate: false
			// 	});
			// 	console.log('🔄 Dashboard layout: Redirected to latest available day:', latestDay);
		}
		// }
	});

	// Load initial data on mount
	$effect(() => {
		if (currentTab && !dayButtonsData) {
			console.log('🔄 Dashboard layout: Initial data load for route:', currentTab);
			loadDayButtonsData(currentTab);
		}
	});

	// Handle day selection (does NOT reload day buttons data)
	async function handleSelectDay(date: string) {
		console.log('🔄 Dashboard layout: Selecting day:', date, '- Day buttons data will NOT reload');

		// Update state immediately for instant highlighting
		console.log('⚡ Dashboard layout: State updated instantly:', date);

		// Use goto for immediate navigation and data loading
		const url = new URL($page.url);
		url.searchParams.set('day', date);
		goto(url.toString(), {
			replaceState: true, // Replace URL entry
			noScroll: true, // No scrolling
			keepFocus: true, // Keep focus
			invalidate: false // No data invalidation
		});
		console.log('⚡ Dashboard layout: Navigation triggered with goto');

		// Clear filters and brush immediately on day change
		logStore.setSelectedLevel(null);
		logStore.setSelectedChannel(null);
		logStore.setSelectedRange(null);
	}
</script>

{#if dayButtonsData}
	<div
		class="mb-4 flex overflow-auto rounded p-3"
		style="background-color: var(--color-bg-secondary);"
	>
		<div class="flex overflow-auto">
			{#if (currentTab === 'logs' && dayButtonsData.devLogsDays?.length > 0) || (currentTab === 'channels' && dayButtonsData.messageDays?.length > 0)}
				<DayButtons
					selectedDay={$page.url.searchParams.get('day')}
					days={currentTab === 'logs' ? dayButtonsData.devLogsDays : dayButtonsData.messageDays}
					loading={false}
					error={null}
					onSelectDay={handleSelectDay}
					type={currentTab === 'logs' ? 'devLogs' : 'messages'}
				/>
			{/if}
		</div>
	</div>
{/if}

<!-- Day Buttons Section - Show loading spinner until data is loaded -->
{#if isLoadingDayButtons}
	<!-- Single general loading spinner -->
	<LoadingSpinner class="m-auto" label="Loading..." size={48} />
{:else if dayButtonsData}
	{@render props.children?.()}
{/if}

<!-- Main Content Area -->
