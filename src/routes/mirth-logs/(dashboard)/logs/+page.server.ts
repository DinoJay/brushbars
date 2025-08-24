import type { ServerLoad } from '@sveltejs/kit';

export const ssr = false;
export const load: ServerLoad = async ({ url, fetch }) => {
	const selectedDay = url.searchParams.get('day');
	const sourcesParam = url.searchParams.get('sources') || 'internal';
	const sources = sourcesParam.split(',').filter(Boolean);

	if (!selectedDay) {
		return {
			success: true,
			devLogsPromise: Promise.resolve([]),
			selectedDay: null
		};
	}

	try {
		console.log(
			'🔄 Logs page: Creating streaming promise for dev logs day:',
			selectedDay,
			'sources:',
			sources.join(',')
		);

		// Create a promise that will actually stream the data
		const devLogsPromise = new Promise<unknown[]>((resolve, reject) => {
			(async () => {
				try {
					console.log(
						'🔄 Starting to fetch dev logs for day:',
						selectedDay,
						'sources:',
						sources.join(',')
					);

					async function fetchLogs(endpoint: string) {
						try {
							const res = await fetch(endpoint);
							if (!res.ok) return [] as any[];
							const data = await res.json().catch(() => null);
							return (data && data.logs) || [];
						} catch {
							return [] as any[];
						}
					}

					const batches: any[][] = [];
					if (sources.includes('internal')) {
						batches.push(await fetchLogs(`/mirth-logs/api/logs-internal/${selectedDay}`));
					}
					if (sources.includes('duomed')) {
						batches.push(await fetchLogs(`/mirth-logs/api/logs-duomed/${selectedDay}`));
					}

					const merged = ([] as any[]).concat(...batches);
					console.log('✅ Logs page: merged logs from sources:', merged.length);
					resolve(merged);
				} catch (error) {
					console.error('❌ Logs page: Failed to stream dev logs:', error);
					reject(error);
				}
			})();
		});

		return {
			success: true,
			devLogsPromise,
			selectedDay,
			streaming: true
		};
	} catch (error) {
		console.error('❌ Logs page: Failed to create streaming promise:', error);

		return {
			success: false,
			devLogsPromise: Promise.resolve([]),
			selectedDay,
			error: error instanceof Error ? error.message : 'Unknown error',
			streaming: false
		};
	}
};
