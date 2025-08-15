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

	// Create promises for streaming results
	const createStreamingPromise = async <T>(
		fetchFn: () => Promise<T>,
		label: string
	): Promise<T> => {
		console.log(`🔄 Dashboard layout: Starting streaming fetch for ${label}`);
		try {
			const result = await fetchFn();
			console.log(`✅ Dashboard layout: Completed streaming fetch for ${label}`);
			return result;
		} catch (error) {
			console.error(`❌ Dashboard layout: Failed streaming fetch for ${label}:`, error);
			throw error;
		}
	};

	// Define fetch functions that return promises
	const fetchDevLogsDays = () =>
		createStreamingPromise(async () => {
			const res = await fetch('/mirth-logs/api/devLogs/days');
			if (!res.ok) throw new Error(`Failed to fetch dev logs days: ${res.status}`);
			const data = await res.json();
			return data?.success ? data.days : [];
		}, 'dev logs days');

	const fetchMessageDays = () =>
		createStreamingPromise(async () => {
			const res = await fetch('/mirth-logs/api/messages/days');
			if (!res.ok) throw new Error(`Failed to fetch message days: ${res.status}`);
			const data = await res.json();
			return data?.success ? data.days : [];
		}, 'message days');

	try {
		// Return promises for streaming results
		const result = {
			// Always fetch both types of days data so DayButtons can show the correct data for current tab
			devLogsDaysPromise: fetchDevLogsDays(),
			messageDaysPromise: fetchMessageDays(),

			// Metadata
			selectedDay,
			success: true,
			routeType: isLogsRoute ? 'logs' : isChannelsRoute ? 'channels' : 'unknown',

			// Helper function to get all data when needed
			getAllData: async () => {
				const [devLogsDays, messageDays] = await Promise.allSettled([
					result.devLogsDaysPromise,
					result.messageDaysPromise
				]);

				return {
					devLogsDays: devLogsDays.status === 'fulfilled' ? devLogsDays.value : [],
					messageDays: messageDays.status === 'fulfilled' ? messageDays.value : [],
					selectedDay,
					success: true,
					routeType: result.routeType
				};
			}
		};

		console.log('🔄 Dashboard layout: Returning streaming promises');
		return result;
	} catch (error) {
		console.warn('Dashboard layout: Failed to create streaming promises:', error);
		return {
			devLogsDaysPromise: Promise.resolve([]),
			messageDaysPromise: Promise.resolve([]),
			selectedDay,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			routeType: isLogsRoute ? 'logs' : isChannelsRoute ? 'channels' : 'unknown',
			getAllData: async () => ({
				devLogsDays: [],
				messageDays: [],
				selectedDay,
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				routeType: isLogsRoute ? 'logs' : isChannelsRoute ? 'channels' : 'unknown'
			})
		};
	}
};
