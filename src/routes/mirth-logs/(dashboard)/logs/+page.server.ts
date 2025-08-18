import type { ServerLoad } from '@sveltejs/kit';

export const ssr = false;
export const load: ServerLoad = async ({ url, fetch }) => {
	const selectedDay = url.searchParams.get('day');
	const host = url.searchParams.get('host');

	if (!selectedDay) {
		return {
			success: true,
			devLogsPromise: Promise.resolve([]),
			selectedDay: null
		};
	}

	try {
		console.log('🔄 Logs page: Creating streaming promise for dev logs day:', selectedDay);

		// Create a promise that will actually stream the data
		const devLogsPromise = new Promise<unknown[]>((resolve, reject) => {
			(async () => {
				try {
					console.log('🔄 Starting to fetch dev logs for day:', selectedDay);

					// Choose endpoint based on host
					const endpoint =
						host === 'brpharmia'
							? `/mirth-logs/api/logs-brpharmia/${selectedDay}`
							: `/mirth-logs/api/devLogs/${selectedDay}`;

					const res = await fetch(endpoint);
					if (!res.ok) throw new Error(`Failed to fetch dev logs: ${res.status}`);

					const data = await res.json();
					const logs = data?.success && Array.isArray(data.logs) ? data.logs : [];

					console.log('✅ Logs page: Streamed dev logs:', logs.length);
					resolve(logs);
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
			host: host || null,
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
