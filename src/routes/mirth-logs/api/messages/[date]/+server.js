import { json } from '@sveltejs/kit';
import { getMirthChannels, getChannelMessages } from '$lib/apiHelpers.js';
import { getDayMessages } from '$lib/server/messageCache.js';

// Helper function to safely get date string
/** @param {string | Date} timestamp */
function safeGetDateString(timestamp) {
	try {
		const date = new Date(timestamp);
		return date.toISOString().split('T')[0];
	} catch {
		return null;
	}
}

export async function GET({ params }) {
	const startTime = Date.now();
	const { date } = params;

	if (!date) {
		return json({ success: false, error: 'Date parameter is required' }, { status: 400 });
	}

	try {
		// 1) Try cache first
		const cached = getDayMessages(date);
		if (cached && Array.isArray(cached)) {
			const sorted = [...cached].sort(
				(/** @type {{ timestamp: string }} */ a, /** @type {{ timestamp: string }} */ b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);
			const endTime = Date.now();
			return json({
				success: true,
				date,
				messages: sorted,
				totalMessages: sorted.length,
				dataSource: 'cache',
				performance: { duration: endTime - startTime, dataSource: 'cache' }
			});
		}

		// 2) Fallback to live fetch
		// Get all channels (respects ATHOME inside helpers)
		const channels = await getMirthChannels();
		console.log('🔍 Channels:', channels);

		// Calculate date range for the specific date
		const targetDate = new Date(date);
		const startDate = new Date(targetDate);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(targetDate);
		endDate.setHours(23, 59, 59, 999);

		// Process channels in parallel for better performance
		const channelPromises = channels.map(async (/** @type {any} */ ch) => {
			try {
				const msgs = await getChannelMessages(ch.id, {
					// startDate: startDate.toISOString(),
					// endDate: endDate.toISOString(),
					limit: 50000,
					includeContent: true
				});

				// Filter messages for the exact date and standardize format
				const dayMessages = msgs
					.filter((/** @type {any} */ m) => {
						const messageDate = safeGetDateString(
							m.receivedDate || m.timestamp || m.time || m.date
						);
						return messageDate === date;
					})
					.map((/** @type {any} */ m) => ({
						id: m.id || m.messageId || Math.random().toString(36).substr(2, 9),
						timestamp:
							m.receivedDate || m.timestamp || m.time || m.date || new Date().toISOString(),
						level: (m.status || m.level || 'INFO').toUpperCase(),
						channel: ch.name,
						message: m.content || m.raw || m.error || `Message from ${ch.name}`,
						// Keep original fields for reference
						originalData: m
					}));

				return dayMessages;
			} catch (err) {
				// Continue other channels even if one fails
				const emsg = /** @type {any} */ (err)?.message;
				console.warn('⚠️ Failed to load messages for channel', ch?.id || ch?.name, emsg);
				return [];
			}
		});

		// Wait for all channel requests to complete
		const channelResults = await Promise.all(channelPromises);
		const allMessages = channelResults.flat();

		// Sort messages by timestamp (newest first)
		allMessages.sort(
			(/** @type {{ timestamp: string }} */ a, /** @type {{ timestamp: string }} */ b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
		// Enforce max 1200 per day (newest first)
		const originalTotal = allMessages.length;
		const limitedMessages = allMessages.slice(0, 1200);

		const endTime = Date.now();
		console.log(
			`📦 Served ${limitedMessages.length}/${originalTotal} messages for ${date} from API in ${endTime - startTime}ms`
		);

		return json({
			success: true,
			date,
			messages: limitedMessages,
			totalMessages: limitedMessages.length,
			originalTotal,
			limitApplied: true,
			totalChannels: channels.length,
			dataSource: 'api',
			performance: { duration: endTime - startTime, dataSource: 'api' }
		});
	} catch (error) {
		const emsg = /** @type {any} */ (error)?.message;
		console.error('❌ Error fetching messages from API:', emsg);
		return json(
			{
				success: false,
				error: 'Failed to fetch messages from API',
				details: emsg
			},
			{ status: 500 }
		);
	}
}
