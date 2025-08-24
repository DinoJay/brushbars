<!-- runes -->
<script lang="ts">
	import { page, navigating } from '$app/stores';
	import { goto } from '$app/navigation';
	import { logStore } from '$stores/logStore.svelte';
	import LoadingSpinner from '../components/LoadingSpinner.svelte';
	import DayButtons from '../components/DayButtons.svelte';

	import type { LayoutData } from './$types';
	export const ssr = false;
	const props = $props<{ data: LayoutData; children?: any }>();

	const currentTab = $derived.by(() => {
		const p = $page.url.pathname;
		if (p.includes('/logs')) return 'logs';
		if (p.includes('/channels')) return 'channels';
		return '';
	});

	let dayButtonsData = $state<{ devLogsDays: any[]; messageDays: any[] } | null>(null);
	let isLoadingDayButtons = $state(false);

	function mergeDaysByDate(...lists: any[][]) {
		const map = new Map<string, any>();
		for (const list of lists) {
			if (!Array.isArray(list)) continue;
			for (const d of list) {
				const prev = map.get(d.date);
				if (!prev) {
					map.set(d.date, { ...d, stats: { ...(d.stats || {}) } });
				} else {
					const keys = ['total', 'INFO', 'ERROR', 'WARN', 'DEBUG', 'WARNING', 'FATAL', 'TRACE'];
					for (const k of keys) {
						if (k === 'total') {
							prev.total = (prev.total || 0) + (d.total || 0);
						} else {
							prev.stats[k] = (prev.stats?.[k] || 0) + (d.stats?.[k] || 0);
						}
					}
					map.set(d.date, prev);
				}
			}
		}
		return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
	}

	let loadCounter = 0;
	async function loadDayButtonsData(route: string) {
		isLoadingDayButtons = true;
		const token = ++loadCounter;
		try {
			const newData: { devLogsDays: any[]; messageDays: any[] } = {
				devLogsDays: dayButtonsData?.devLogsDays ?? [],
				messageDays: dayButtonsData?.messageDays ?? []
			};

			if (route === 'logs') {
				const sourcesParam = $page.url.searchParams.get('sources') || '';
				const sources = sourcesParam.split(',').filter(Boolean);
				if (sources.length === 0) {
					newData.devLogsDays = [];
					dayButtonsData = newData;
					logStore.updateDevLogDays([]);
					logStore.updateDevLogs([]);
					logStore.updateLiveDevLogEntries([]);
					return;
				}
				async function fetchDays(endpoint: string) {
					try {
						const resp = await fetch(endpoint);
						if (!resp.ok) return [] as any[];
						const d = await resp.json().catch(() => null);
						return (d && d.days) || [];
					} catch {
						return [] as any[];
					}
				}
				const endpoints: string[] = [];
				if (sources.includes('internal')) endpoints.push('/mirth-logs/api/logs-internal/days');
				if (sources.includes('duomed')) endpoints.push('/mirth-logs/api/logs-duomed/days');
				const lists = await Promise.all(endpoints.map(fetchDays));
				if (lists.length === 0) lists.push([]);
				newData.devLogsDays = mergeDaysByDate(...lists);
			} else if (route === 'channels') {
				const sourcesParam = $page.url.searchParams.get('sources') || '';
				const sources = sourcesParam.split(',').filter(Boolean);
				if (sources.length === 0) {
					newData.messageDays = [];
					dayButtonsData = newData;
					logStore.updateMessageDays([]);
					logStore.updateMessages([]);
					logStore.updateLiveMessages([]);
					return;
				}
				async function fetchDays(endpoint: string) {
					try {
						const resp = await fetch(endpoint);
						if (!resp.ok) return [] as any[];
						const d = await resp.json().catch(() => null);
						return (d && d.days) || [];
					} catch {
						return [] as any[];
					}
				}
				const endpoints: string[] = [];
				if (sources.includes('internal')) endpoints.push('/mirth-logs/api/messages-internal/days');
				if (sources.includes('duomed')) endpoints.push('/mirth-logs/api/messages-duomed/days');
				const lists = await Promise.all(endpoints.map(fetchDays));
				if (lists.length === 0) lists.push([]);
				newData.messageDays = mergeDaysByDate(...lists);
			}

			if (token !== loadCounter) return;
			dayButtonsData = newData;
			if (route === 'logs') {
				logStore.updateDevLogDays(newData.devLogsDays || []);
			} else if (route === 'channels') {
				logStore.updateMessageDays(newData.messageDays || []);
			}
		} catch (error) {
			console.error('❌ Dashboard layout: Failed to load day buttons data:', error);
			if (!dayButtonsData) {
				dayButtonsData = { devLogsDays: [], messageDays: [] };
			}
		} finally {
			if (token === loadCounter) isLoadingDayButtons = false;
		}
	}

	let lastSources = $state<string>('');
	$effect(() => {
		const sources = $page.url.searchParams.get('sources') || '';
		if (sources !== lastSources) {
			lastSources = sources;
			const route = currentTab;
			if (route) loadDayButtonsData(route);
		}
	});

	let lastRoute = $state<string>('');
	$effect(() => {
		const route = currentTab;
		if (route && route !== lastRoute) {
			lastRoute = route;
			loadDayButtonsData(route);
		}
	});

	$effect(() => {
		const currentDay = $page.url.searchParams.get('day');
		const route = currentTab;
		if (route && dayButtonsData) {
			const isDayValid = logStore.isDayValid(route, currentDay);
			if (!isDayValid) {
				const latestDay = logStore.getLatestDay(route);
				if (latestDay) {
					const url = new URL($page.url);
					url.searchParams.set('day', latestDay);
					goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
				}
			}
		}
	});

	function handleSelectDay(date: string) {
		queueMicrotask(() => {
			logStore.setSelectedLevel(null);
			logStore.setSelectedChannel(null);
			logStore.setSelectedRange(null);
		});
		const url = new URL($page.url);
		url.searchParams.set('day', date);
		const currentHost = $page.url.searchParams.get('host');
		if (currentHost) url.searchParams.set('host', currentHost);
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}
</script>

{#if isLoadingDayButtons || dayButtonsData}
	<div
		class="mb-4 flex flex-1 overflow-x-auto overflow-y-hidden rounded p-3"
		style="background-color: var(--color-bg-secondary); width: 100%; min-height: 240px;"
	>
		{#if isLoadingDayButtons}
			<LoadingSpinner class="m-auto" label="Loading days..." size={24} />
		{:else}
			<DayButtons
				selectedDay={$page.url.searchParams.get('day')}
				days={currentTab === 'logs'
					? (dayButtonsData?.devLogsDays ?? [])
					: (dayButtonsData?.messageDays ?? [])}
				loading={isLoadingDayButtons}
				error={null}
				onSelectDay={handleSelectDay}
				type={currentTab === 'logs' ? 'devLogs' : 'messages'}
			/>
		{/if}
	</div>
	{#if !isLoadingDayButtons && dayButtonsData && ((currentTab === 'logs' && (!dayButtonsData.devLogsDays || dayButtonsData.devLogsDays.length === 0)) || (currentTab === 'channels' && (!dayButtonsData.messageDays || dayButtonsData.messageDays.length === 0)))}
		<div class="flex w-full items-center justify-center py-8">
			<p class="text-gray-500">No {currentTab === 'logs' ? 'dev logs' : 'messages'} available</p>
		</div>
	{/if}
{/if}

{#if $navigating}
	<LoadingSpinner class="m-auto" label="Loading..." size={48} />
{:else}
	{@render props.children?.()}
{/if}
