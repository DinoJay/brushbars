import type { ServerLoad } from '@sveltejs/kit';
export const ssr = false;
export const load: ServerLoad = async ({ url, fetch }) => {
	const selectedDay = url.searchParams.get('day');
	const sourcesParam = url.searchParams.get('sources') || '';
	const sources = sourcesParam.split(',').filter(Boolean);

	if (!selectedDay) {
		return {
			success: true,
			messagesPromise: Promise.resolve([]),
			selectedDay: null
		};
	}

	try {
		console.log('🔄 Channels page: Creating streaming promise for messages day:', selectedDay);

		// Create a promise that will actually stream the data
		const messagesPromise = new Promise<unknown[]>((resolve, reject) => {
			(async () => {
				try {
					console.log(
						'🔄 Starting to fetch messages for day:',
						selectedDay,
						'sources:',
						sources.join(',')
					);

					async function fetchMsgs(endpoint: string) {
						try {
							const res = await fetch(endpoint);
							if (!res.ok) return [] as any[];
							const data = await res.json().catch(() => null);
							return (data && data.messages) || [];
						} catch {
							return [] as any[];
						}
					}

					const batches: any[][] = [];
					if (sources.length === 0) {
						resolve([]);
						return;
					}
					if (sources.includes('internal')) {
						batches.push(await fetchMsgs(`/mirth-logs/api/messages-internal/${selectedDay}`));
					}
					if (sources.includes('duomed')) {
						batches.push(await fetchMsgs(`/mirth-logs/api/messages-duomed/${selectedDay}`));
					}

					const merged = ([] as any[]).concat(...batches);
					console.log('✅ Channels page: merged messages from sources:', merged.length);
					resolve(merged);
				} catch (error) {
					console.error('❌ Channels page: Failed to stream messages:', error);
					reject(error);
				}
			})();
		});

		return {
			success: true,
			messagesPromise,
			selectedDay,
			streaming: true
		};
	} catch (error) {
		console.error('❌ Channels page: Failed to create streaming promise:', error);

		return {
			success: false,
			messagesPromise: Promise.resolve([]),
			selectedDay,
			error: error instanceof Error ? error.message : 'Unknown error',
			streaming: false
		};
	}
};
