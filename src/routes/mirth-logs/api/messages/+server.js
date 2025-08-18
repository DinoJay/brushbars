import { json } from '@sveltejs/kit';
import { getMirthChannels, getChannelMessages, getChannelMessageStats } from '$lib/apiHelpers.js';

export async function GET({ url }) {
	const searchParams = url.searchParams;
	const channelId = searchParams.get('channelId');
	const channelName = searchParams.get('channelName');

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
