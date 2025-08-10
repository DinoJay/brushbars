<!-- runes -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DayButtons from '$components/DayButtons.svelte';
	import LogFilters from '$components/LogFilters.svelte';
	import MirthActivityTimeline from '$components/timeline/MirthActivityTimeline.svelte';
	import LogTable from '$components/LogTable.svelte';
	import { logStore } from '$stores/logStore.svelte';

	const selectedDayFromUrl = $derived(() => $page.url.searchParams.get('day'));

	// Ensure days are loaded
	$effect(() => {
		if (!logStore.messageDays?.length) {
			(async () => {
				try {
					logStore.setLoadingDays(true);
					const res = await fetch('/mirth-logs/api/messages/days?days=30');
					const data = await res.json();
					if (data.success && Array.isArray(data.days)) {
						logStore.updateMessageDays(data.days);
					}
				} finally {
					logStore.setLoadingDays(false);
				}
			})();
		}
	});

	// Fetch messages when day changes
	$effect(() => {
		const day = selectedDayFromUrl();
		if (!day) return;
		const controller = new AbortController();
		(async () => {
			try {
				const res = await fetch(`/mirth-logs/api/messages/${day}`, { signal: controller.signal });
				const data = await res.json();
				if (data.success && Array.isArray(data.messages)) {
					logStore.updateMessages(data.messages);
				}
			} catch {}
		})();
		return () => controller.abort();
	});

	async function handleSelectDay(date: string) {
		const url = new URL(window.location.href);
		url.searchParams.set('day', date);
		await goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});
	}

	const showSpinner = $derived.by(
		() => logStore.loadingDays || !(logStore.messageDays && logStore.messageDays.length)
	);
</script>

{#if showSpinner}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"
			></div>
			<p class="text-gray-600">Loading days…</p>
		</div>
	</div>
{:else}
	<div class="mb-6 rounded bg-white p-4 shadow">
		<DayButtons
			selectedDay={selectedDayFromUrl()}
			todaysLiveEntries={[]}
			days={logStore.messageDays}
			loading={logStore.loadingDays}
			error={logStore.errorDays}
			onSelectDay={handleSelectDay}
		/>
	</div>

	<LogFilters
		entries={logStore.allMessages}
		onFiltersChange={(l, c) => {
			logStore.setSelectedLevel(l as any);
			logStore.setSelectedChannel(c);
		}}
	/>

	<div class="mb-6 rounded bg-white p-4 shadow">
		<MirthActivityTimeline
			entries={logStore.timelineMessageEntries}
			onRangeChange={(r) => logStore.setSelectedRange(r)}
			resetOn={`${selectedDayFromUrl() || ''}|${logStore.selectedChannel || ''}`}
		/>
	</div>
	<div class="rounded bg-white p-4 shadow">
		<LogTable entries={logStore.filteredMessages} selectedRange={logStore.selectedRange} />
	</div>
{/if}
