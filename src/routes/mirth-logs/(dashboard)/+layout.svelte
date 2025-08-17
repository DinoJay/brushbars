<!-- runes -->
<script lang="ts">
	import { page, navigating } from '$app/stores';

	import { goto, replaceState, invalidate } from '$app/navigation';
	import { logStore } from '$stores/logStore.svelte';
	import LoadingSpinner from '../components/LoadingSpinner.svelte';
	import DayButtons from '../components/DayButtons.svelte';

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

			// Update logStore with the loaded day data
			if (route === 'logs') {
				logStore.updateDevLogDays(newData.devLogsDays || []);
			} else if (route === 'channels') {
				logStore.updateMessageDays(newData.messageDays || []);
			}

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
			// Use logStore to validate day and get latest available day
			const isDayValid = logStore.isDayValid(route, currentDay);

			if (!isDayValid) {
				const latestDay = logStore.getLatestDay(route);
				if (latestDay) {
					// Redirect to latest available day
					const url = new URL($page.url);
					url.searchParams.set('day', latestDay);
					goto(url.toString(), {
						replaceState: true,
						noScroll: true,
						keepFocus: true
					});
					console.log('🔄 Dashboard layout: Redirected to latest available day:', latestDay);
				}
			}
		}
	});

	// Load initial data on mount
	$effect(() => {
		if (currentTab && !dayButtonsData) {
			console.log('🔄 Dashboard layout: Initial data load for route:', currentTab);
			loadDayButtonsData(currentTab);
		}
	});

	// Handle day selection
	function handleSelectDay(date: string) {
		console.log('🔄 Dashboard layout: Selecting day:', date);

		// Clear filters and brush immediately on day change (batched for performance)
		queueMicrotask(() => {
			logStore.setSelectedLevel(null);
			logStore.setSelectedChannel(null);
			logStore.setSelectedRange(null);
		});

		// Use goto with replaceState to update URL and trigger proper navigation
		const url = new URL($page.url);
		url.searchParams.set('day', date);

		goto(url.toString(), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});

		console.log('✅ Dashboard layout: URL updated for day:', date);
	}
</script>

{#if dayButtonsData}
	{#if (currentTab === 'logs' && dayButtonsData.devLogsDays?.length > 0) || (currentTab === 'channels' && dayButtonsData.messageDays?.length > 0)}
		<div
			class="mb-4 flex overflow-auto rounded p-3"
			style="background-color: var(--color-bg-secondary);"
		>
			<div class="flex overflow-auto">
				<DayButtons
					selectedDay={$page.url.searchParams.get('day')}
					days={currentTab === 'logs' ? dayButtonsData.devLogsDays : dayButtonsData.messageDays}
					loading={false}
					error={null}
					onSelectDay={handleSelectDay}
					type={currentTab === 'logs' ? 'devLogs' : 'messages'}
				/>
			</div>
		</div>
		{#if (currentTab === 'logs' && (!dayButtonsData.devLogsDays || dayButtonsData.devLogsDays.length === 0)) || (currentTab === 'channels' && (!dayButtonsData.messageDays || dayButtonsData.messageDays.length === 0))}
			<div class="flex w-full items-center justify-center py-8">
				<p class="text-gray-500">
					No {currentTab === 'logs' ? 'dev logs' : 'messages'} available
				</p>
			</div>
		{/if}
	{/if}
{/if}

<!-- Day Buttons Section - Show loading spinner until data is loaded -->
{#if $navigating}
	<!-- Single general loading spinner -->
	<LoadingSpinner class="m-auto" label="Loading..." size={48} />
{:else}
	{@render props.children?.()}
{/if}

<!-- Main Content Area -->
