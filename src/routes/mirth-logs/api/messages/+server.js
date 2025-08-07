import { json } from '@sveltejs/kit';
import { getMirthChannels, getChannelMessages, getChannelMessageStats } from '$lib/apiHelpers.js';

export async function GET({ url }) {
	const searchParams = url.searchParams;
	const channelId = searchParams.get('channelId');
	const channelName = searchParams.get('channelName');
	const startDate = searchParams.get('startDate');
	const endDate = searchParams.get('endDate');
	const limit = parseInt(searchParams.get('limit')) || 100;
	const offset = parseInt(searchParams.get('offset')) || 0;
	const includeContent = searchParams.get('includeContent') === 'true';

	try {
		// If no specific channel is requested, return all channels
		if (!channelId && !channelName) {
			const channels = await getMirthChannels();

			return json({
				success: true,
				type: 'channels',
				channels: channels,
				totalChannels: channels.length
			});
		}

		// Find channel by name if channelId not provided
		let targetChannelId = channelId;
		if (!targetChannelId && channelName) {
			const channels = await getMirthChannels();
			const channel = channels.find((ch) =>
				ch.name.toLowerCase().includes(channelName.toLowerCase())
			);
			if (channel) {
				targetChannelId = channel.id;
			} else {
				return json(
					{
						success: false,
						error: `Channel not found: ${channelName}`
					},
					{ status: 404 }
				);
			}
		}

		// Get messages for the specific channel
		const messages = await getChannelMessages(targetChannelId, {
			startDate,
			endDate,
			limit,
			offset,
			includeContent
		});

		// Get message statistics if date range is provided
		let stats = null;
		if (startDate && endDate) {
			stats = await getChannelMessageStats(targetChannelId, startDate, endDate);
		}

		// Apply pagination
		const paginatedMessages = messages.slice(offset, offset + limit);

		// Get channel details
		const channels = await getMirthChannels();
		const channelDetails = channels.find((ch) => ch.id === targetChannelId);

		return json({
			success: true,
			type: 'messages',
			channel: channelDetails,
			messages: paginatedMessages,
			pagination: {
				total: messages.length,
				limit,
				offset,
				hasMore: offset + limit < messages.length
			},
			filters: {
				channelId: targetChannelId,
				channelName,
				startDate,
				endDate,
				includeContent
			},
			statistics: stats,
			summary: {
				totalMessages: messages.length,
				messageStatuses: [...new Set(messages.map((m) => m.status))],
				connectorTypes: [...new Set(messages.map((m) => m.connectorType).filter(Boolean))],
				processedCount: messages.filter((m) => m.processed).length,
				failedCount: messages.filter((m) => m.status === 'ERROR').length
			}
		});
	} catch (error) {
		console.error('❌ Error fetching channel messages:', error);

		return json(
			{
				success: false,
				error: 'Failed to fetch messages from Mirth Connect API',
				details: error.message
			},
			{ status: 500 }
		);
	}
}
