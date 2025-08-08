import { json } from '@sveltejs/kit';
import * as d3 from 'd3';
import { getMirthChannels, getChannelMessages } from '$lib/apiHelpers.js';

// Build an ISO date (YYYY-MM-DD) from a Date
function toIsoDate(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
}

// Aggregate per-day message counts across all channels
export async function GET({ url }) {
	const startTime = Date.now();
	const searchParams = url.searchParams;
	const daysParam = parseInt(searchParams.get('days') || '30', 10);
	const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

	try {
		// Time range: last N days (inclusive of today)
		const end = new Date();
		const start = new Date();
		start.setDate(end.getDate() - (days - 1));

		// Get all channels (respects ATHOME inside helpers)
		const channels = await getMirthChannels();

		// Build a map of day -> stats and messages
		const dayMap = new Map();
		const ensureDay = (dayString) => {
			if (!dayMap.has(dayString)) {
				const date = new Date(dayString);
				dayMap.set(dayString, {
					date: dayString,
					formattedDate: d3.timeFormat('%a, %b %d')(date),
					stats: { total: 0, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 },
					messages: []
				});
			}
			return dayMap.get(dayString);
		};

		// Process channels in parallel for better performance
		const channelPromises = channels.map(async (ch) => {
			try {
				const msgs = await getChannelMessages(ch.id, {
					startDate: start.toISOString(),
					endDate: end.toISOString(),
					limit: 50000
				});

				// Process messages for this channel
				const channelResults = [];
				for (const m of msgs) {
					// Normalize received date to YYYY-MM-DD
					const d = new Date(m.receivedDate || m.timestamp || m.time || m.date || Date.now());
					const dayString = toIsoDate(d);

					// Determine level from message status
					const level = (m.status || m.level || 'INFO').toUpperCase();

					// Transform message to TimelineEntry format
					const transformedMessage = {
						id: m.id || m.correlationId || `${ch.id}_${Date.now()}_${Math.random()}`,
						timestamp:
							m.receivedDate || m.timestamp || m.time || m.date || new Date().toISOString(),
						level: level,
						channel: ch.name,
						message: m.content || m.raw || m.transformed || 'No message content',
						// Preserve original message data
						originalMessage: {
							...m,
							channelName: ch.name,
							channelId: ch.id
						}
					};

					channelResults.push({
						dayString,
						level,
						transformedMessage
					});
				}

				return channelResults;
			} catch (err) {
				// Continue other channels even if one fails
				console.warn('⚠️ Failed to load messages for channel', ch?.id || ch?.name, err?.message);
				return [];
			}
		});

		// Wait for all channels to complete
		const allChannelResults = await Promise.all(channelPromises);

		// Aggregate results from all channels
		for (const channelResult of allChannelResults.flat()) {
			const target = ensureDay(channelResult.dayString);
			target.stats.total += 1;

			if (target.stats[channelResult.level] !== undefined) {
				target.stats[channelResult.level] += 1;
			} else {
				target.stats.INFO += 1; // Default to INFO for unknown levels
			}

			target.messages.push(channelResult.transformedMessage);
		}

		// Convert map to sorted array and sort messages within each day
		const daysList = Array.from(dayMap.values())
			.map((day) => ({
				...day,
				messages: day.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
				// .slice(0, 100) // Limit to 100 most recent messages per day
			}))
			.sort((a, b) => a.date.localeCompare(b.date));
		const duration = Date.now() - startTime;

		const totalMessages = daysList.reduce((sum, day) => sum + day.messages.length, 0);

		console.log(
			`🚀 Message days API completed in ${duration}ms for ${channels.length} channels, ${daysList.length} days, ${totalMessages} messages`
		);

		return json({
			success: true,
			days: daysList,
			totalDays: daysList.length,
			totalChannels: channels.length,
			totalMessages,
			range: { start: start.toISOString(), end: end.toISOString() },
			daysWindow: days,
			performance: { duration }
		});
	} catch (error) {
		console.error('❌ Error fetching message days:', error);
		return json(
			{ success: false, error: 'Failed to aggregate message days', details: error?.message },
			{ status: 500 }
		);
	}
}
