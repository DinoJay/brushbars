import { json } from '@sveltejs/kit';
import { getMirthChannels, getChannelMessages } from '$lib/apiHelpers.js';

// Helper function to safely get date string
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
		// Get all channels (respects ATHOME inside helpers)
		const channels = await getMirthChannels();

		// Calculate date range for the specific date
		const targetDate = new Date(date);
		const startDate = new Date(targetDate);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(targetDate);
		endDate.setHours(23, 59, 59, 999);

		// Process channels in parallel for better performance
		const channelPromises = channels.map(async (ch) => {
			try {
				const msgs = await getChannelMessages(ch.id, {
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString(),
					limit: 50000,
					includeContent: true
				});

				// Filter messages for the exact date and standardize format
				const dayMessages = msgs
					.filter((m) => {
						const messageDate = safeGetDateString(
							m.receivedDate || m.timestamp || m.time || m.date
						);
						return messageDate === date;
					})
					.map((m) => ({
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
				console.warn('⚠️ Failed to load messages for channel', ch?.id || ch?.name, err?.message);
				return [];
			}
		});

		// Wait for all channel requests to complete
		const channelResults = await Promise.all(channelPromises);
		const allMessages = channelResults.flat();

		// Sort messages by timestamp (newest first)
		allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

		const endTime = Date.now();
		console.log(
			`📦 Served ${allMessages.length} messages for ${date} from API in ${endTime - startTime}ms`
		);

		return json({
			success: true,
			date,
			messages: allMessages,
			totalMessages: allMessages.length,
			totalChannels: channels.length,
			dataSource: 'api',
			performance: { duration: endTime - startTime, dataSource: 'api' }
		});
	} catch (error) {
		console.error('❌ Error fetching messages from API:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch messages from API',
				details: error?.message
			},
			{ status: 500 }
		);
	}
}
