import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, fetch }) => {
	// Determine which route is being accessed
	const isLogsRoute = url.pathname.includes('/logs');
	const isChannelsRoute = url.pathname.includes('/channels');
	const selectedDay = url.searchParams.get('day');

	console.log('🔄 Dashboard layout: Loading data for route:', {
		isLogsRoute,
		isChannelsRoute,
		selectedDay
	});

	try {
		let devLogsDaysRes: { success?: boolean; days?: unknown[] } | null = null;
		let messagesDaysRes: { success?: boolean; days?: unknown[] } | null = null;
		let devLogsForDay: unknown[] = [];
		let messagesForDay: unknown[] = [];

		if (isLogsRoute) {
			console.log('🔄 Dashboard layout: Fetching dev log days...');
			const res = await fetch('/mirth-logs/api/devLogs/days');
			if (res.ok) devLogsDaysRes = await res.json();

			if (selectedDay) {
				console.log('🔄 Dashboard layout: Fetching dev logs for day', selectedDay);
				const dayRes = await fetch(`/mirth-logs/api/devLogs/${selectedDay}`);
				if (dayRes.ok) {
					const dayJson = await dayRes.json();
					if (dayJson?.success && Array.isArray(dayJson.logs)) devLogsForDay = dayJson.logs;
				}
			}
		}

		if (isChannelsRoute) {
			console.log('🔄 Dashboard layout: Fetching message days...');
			const res = await fetch('/mirth-logs/api/messages/days');
			if (res.ok) messagesDaysRes = await res.json();

			if (selectedDay) {
				console.log('🔄 Dashboard layout: Fetching messages for day', selectedDay);
				const dayRes = await fetch(`/mirth-logs/api/messages/${selectedDay}`);
				if (dayRes.ok) {
					const dayJson = await dayRes.json();
					if (dayJson?.success && Array.isArray(dayJson.messages))
						messagesForDay = dayJson.messages;
				}
			}
		}

		return {
			devLogsDays: devLogsDaysRes?.success ? devLogsDaysRes.days : [],
			messageDays: messagesDaysRes?.success ? messagesDaysRes.days : [],
			devLogsForDay,
			messagesForDay,
			selectedDay,
			success: true,
			routeType: isLogsRoute ? 'logs' : isChannelsRoute ? 'channels' : 'unknown'
		};
	} catch (error) {
		console.warn('Dashboard layout: Failed to load data:', error);
		return {
			devLogsDays: [],
			messageDays: [],
			devLogsForDay: [],
			messagesForDay: [],
			selectedDay,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			routeType: isLogsRoute ? 'logs' : isChannelsRoute ? 'channels' : 'unknown'
		};
	}
};
