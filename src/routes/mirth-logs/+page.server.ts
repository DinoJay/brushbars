import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const day = url.searchParams.get('day');
	const tab = url.searchParams.get('tab') || 'logs';

	console.log('🔄 Server load function called:', { day, tab });

	if (!day) {
		return {
			day: null,
			tab,
			logs: [],
			messages: [],
			success: false,
			error: 'No day specified'
		};
	}

	try {
		let logs = [];
		let messages = [];

		if (tab === 'channels') {
			// Fetch messages for the specified day
			const res = await fetch(`/mirth-logs/api/messages/${day}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success && Array.isArray(data.messages)) {
					messages = data.messages;
					console.log('✅ Server: Loaded messages:', messages.length);
				}
			}
		} else {
			// Fetch dev logs for the specified day
			const res = await fetch(`/mirth-logs/api/devLogs/${day}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success && Array.isArray(data.logs)) {
					logs = data.logs;
					console.log('✅ Server: Loaded dev logs:', logs.length);
				}
			}
		}

		return {
			day,
			tab,
			logs,
			messages,
			success: true
		};
	} catch (error) {
		console.error('❌ Server load error:', error);
		return {
			day,
			tab,
			logs: [],
			messages: [],
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};
