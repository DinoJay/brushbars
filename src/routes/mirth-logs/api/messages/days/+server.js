import { json } from '@sveltejs/kit';
import * as d3 from 'd3';
import { getMirthChannels, getChannelMessages } from '$lib/apiHelpers.js';

// Build an ISO date (YYYY-MM-DD) from a Date
function toIsoDate(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
}

export async function GET({ url }) {
	const startTime = Date.now();
	const searchParams = url.searchParams;
	const channelId = searchParams.get('channelId');
	const daysParam = parseInt(searchParams.get('days') || '30', 10);
	const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

	try {
		// Time range: last N days (inclusive of today)
		const end = new Date();
		const start = new Date();
		start.setDate(end.getDate() - (days - 1));

		// Helper to bucket messages by day
		function bucketMessagesByDay(messages, buckets) {
			for (const m of messages) {
				const ts = m.receivedDate || m.timestamp || m.time || m.date || new Date();
				const d = toIsoDate(new Date(ts));
				if (!buckets.has(d)) {
					buckets.set(d, { total: 0, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 });
				}
				const b = buckets.get(d);
				b.total += 1;
				const lvl = (m.status || m.level || 'INFO').toUpperCase();
				if (b[lvl] !== undefined) b[lvl] += 1;
			}
		}

		if (channelId) {
			const dateBuckets = new Map();
			const messages = await getChannelMessages(channelId, {
				startDate: start.toISOString(),
				endDate: end.toISOString(),
				limit: 200000
			});
			bucketMessagesByDay(messages, dateBuckets);
			const daysList = [];
			for (let i = 0; i < days; i++) {
				const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
				const key = toIsoDate(day);
				const stats = dateBuckets.get(key) || { total: 0, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 };
				daysList.push({ date: key, formattedDate: d3.timeFormat('%a, %b %d')(day), stats });
			}
			return json({
				success: true,
				mode: 'single-channel',
				channelId,
				days: daysList,
				totalDays: daysList.length,
				range: { start: start.toISOString(), end: end.toISOString() }
			});
		}

		// Per-channel breakdown for all available channels
		const channels = await getMirthChannels();
		const allMessages = []; // Collect all messages for timeline and table

		// Process channels in parallel for better performance
		// This is already the optimal parallelization - all channel message requests happen simultaneously
		const channelPromises = channels.map(async (ch) => {
			try {
				const dateBuckets = new Map();
				const messages = await getChannelMessages(ch.id, {
					startDate: start.toISOString(),
					endDate: end.toISOString(),
					limit: 50000 // Reduced limit for faster loading
				});

				// Standardize message structure to match log structure
				const standardizedMessages = messages.map((m) => ({
					id: m.id || m.messageId || Math.random().toString(36).substr(2, 9),
					timestamp: m.receivedDate || m.timestamp || m.time || m.date || new Date().toISOString(),
					level: (m.status || m.level || 'INFO').toUpperCase(),
					channel: ch.name,
					message: m.content || m.raw || m.error || `Message from ${ch.name}`,
					// Keep original fields for reference
					originalData: m
				}));
				allMessages.push(...standardizedMessages);

				bucketMessagesByDay(messages, dateBuckets);
				const daysList = [];
				for (let i = 0; i < days; i++) {
					const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
					const key = toIsoDate(day);
					const stats = dateBuckets.get(key) || { total: 0, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 };
					daysList.push({ date: key, formattedDate: d3.timeFormat('%a, %b %d')(day), stats });
				}
				const totals = daysList.reduce(
					(acc, d) => ({
						total: acc.total + d.stats.total,
						INFO: acc.INFO + d.stats.INFO,
						ERROR: acc.ERROR + d.stats.ERROR,
						WARN: acc.WARN + d.stats.WARN,
						DEBUG: acc.DEBUG + d.stats.DEBUG
					}),
					{ total: 0, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 }
				);
				return {
					channel: { id: ch.id, name: ch.name, description: ch.description, enabled: ch.enabled },
					days: daysList,
					totals
				};
			} catch (e) {
				return {
					channel: { id: ch.id, name: ch.name },
					days: [],
					totals: { total: 0, INFO: 0, ERROR: 0, WARN: 0, DEBUG: 0 },
					error: 'fetch_failed'
				};
			}
		});

		// Wait for all channel requests to complete
		const perChannel = await Promise.all(channelPromises);

		const endTime = Date.now();
		console.log(
			`🚀 Messages API completed in ${endTime - startTime}ms for ${perChannel.length} channels, ${allMessages.length} messages`
		);

		return json({
			success: true,
			mode: 'all-channels',
			channels: perChannel,
			messages: allMessages, // Include all messages for timeline and table
			totalChannels: perChannel.length,
			range: { start: start.toISOString(), end: end.toISOString() },
			daysWindow: days,
			performance: { duration: endTime - startTime }
		});
	} catch (error) {
		console.error('❌ Error fetching available message days:', error);
		return json(
			{ success: false, error: 'Failed to fetch available message days', details: error.message },
			{ status: 500 }
		);
	}
}
