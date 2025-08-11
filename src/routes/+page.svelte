<script lang="ts">
	import { goto } from '$app/navigation';
	import { logStore } from '$stores/logStore.svelte';

	let statusText = $state('Loading days...');

	$effect(() => {
		const controller = new AbortController();
		(async () => {
			try {
				logStore.setLoadingDays(true);
				statusText = 'Loading dev log days and message days...';

				const [devDaysRes, msgDaysRes] = await Promise.all([
					fetch('/mirth-logs/api/devLogs/days?days=30', { signal: controller.signal }),
					fetch('/mirth-logs/api/messages/days?days=30', { signal: controller.signal })
				]);

				const [devDays, msgDays] = await Promise.all([devDaysRes.json(), msgDaysRes.json()]);

				if (devDays?.success && Array.isArray(devDays.days)) {
					logStore.updateDevLogDays(devDays.days);
				}
				if (msgDays?.success && Array.isArray(msgDays.days)) {
					logStore.updateMessageDays(msgDays.days);
				}

				// Determine selected day:
				// 1) Use ?day=YYYY-MM-DD if provided
				// 2) Else pick the latest available dev log day
				// 3) Else fallback to today
				const search = typeof window !== 'undefined' ? window.location.search : '';
				const params = new URLSearchParams(search);
				let selectedDay = params.get('day');
				if (!selectedDay) {
					const days = Array.isArray(devDays?.days) ? devDays.days : [];
					if (days.length > 0) {
						selectedDay = days.reduce(
							(latest: string, d: { date?: string }) =>
								!latest || (d?.date || '') > latest ? d?.date || latest : latest,
							''
						);
					}
				}
				if (!selectedDay) {
					selectedDay = new Date().toISOString().split('T')[0];
				}
				logStore.setSelectedDay(selectedDay);
			} catch (e) {
				statusText = 'Proceeding to dashboard...';
			} finally {
				logStore.setLoadingDays(false);
				// Ensure we navigate with a ?day= param set to the chosen day
				const search = typeof window !== 'undefined' ? window.location.search : '';
				const params = new URLSearchParams(search);
				if (!params.get('day') && logStore.selectedDay) {
					params.set('day', logStore.selectedDay);
				}
				const qs = params.toString();
				goto(`/mirth-logs${qs ? `?${qs}` : ''}`);
			}
		})();
		return () => controller.abort();
	});
</script>

<div class="bg-gray-25 flex min-h-screen items-center justify-center dark:bg-gray-900">
	<div class="text-center">
		<div
			class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500 dark:border-blue-400"
		></div>
		<p class="text-gray-600 dark:text-gray-300">{statusText}</p>
	</div>
</div>
