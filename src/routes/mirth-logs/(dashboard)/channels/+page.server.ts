import type { ServerLoad } from '@sveltejs/kit';
export const ssr = false;
export const load: ServerLoad = async ({ url, fetch }) => {
	const selectedDay = url.searchParams.get('day');

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
					console.log('🔄 Starting to fetch messages for day:', selectedDay);

					// Simulate streaming delay to show loading state

					const res = await fetch(`/mirth-logs/api/messages/${selectedDay}`);
					if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);

					const data = await res.json();
					const messages = data?.success && Array.isArray(data.messages) ? data.messages : [];

					console.log('✅ Channels page: Streamed messages:', messages.length);
					resolve(messages);
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
