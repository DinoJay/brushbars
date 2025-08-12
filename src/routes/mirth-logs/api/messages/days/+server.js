import { json } from '@sveltejs/kit';
import * as d3 from 'd3';
import { getMirthChannels, getChannelMessages } from '$lib/apiHelpers.js';
import { warmCache } from '$lib/server/messageCache.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Build an ISO date (YYYY-MM-DD) from a Date - FIXED VERSION
/** @param {Date} date */
function toIsoDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// Aggregate per-day message counts across all channels
export async function GET({ url }) {
	const startTime = Date.now();
	const searchParams = url.searchParams;
	const daysParam = parseInt(searchParams.get('days') || '30', 10);
	const days = 60; //Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

	try {
		// Time range: last N days (inclusive of today)
		// ... existing code ...

		// Time range: last N days (inclusive of today)
		const end = new Date();
		const start = new Date();
		start.setDate(end.getDate() - (days - 1));

		// Set start to beginning of day (00:00:00.000)
		start.setHours(0, 0, 0, 0);
		// Set end to end of day (23:59:59.999)
		end.setHours(23, 59, 59, 999);

		// ... existing code ...
		console.log(
			'🔍 Environment check - ATHOME:',
			process.env.ATHOME,
			'athome:',
			process.env.athome
		);

		// Get all channels (respects ATHOME inside helpers)
		const channels = await getMirthChannels();
		// console.log('🔍 Retrieved channels:', channels.length, 'channels');

		// Build a map of day -> stats and messages
		const dayMap = new Map();
		const ensureDay = (/** @type {string} */ dayString) => {
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
		const channelPromises = channels.map(async (/** @type {any} */ ch) => {
			try {
				console.log(`🔍 Processing channel: ${ch.name} (${ch.id})`);
				const msgs = await getChannelMessages(ch.id, {
					startDate: start.toISOString(),
					endDate: end.toISOString(),
					limit: 500000
				});
				console.log(`🔍 Channel ${ch.name} ID ${ch.id} returned ${msgs.length} messages`);

				// Process messages for this channel
				const channelResults = [];
				for (const m of msgs) {
					// Normalize received date to YYYY-MM-DD
					const d = new Date(m.receivedDate || m.timestamp || m.time || m.date || Date.now());
					const dayString = toIsoDate(d);

					// Determine level from message status
					const level = (m.status || m.level || 'INFO').toUpperCase();

					// Transform message to comprehensive TimelineEntry format
					const transformedMessage = {
						id: m.id || m.correlationId || `${ch.id}_${Date.now()}_${Math.random()}`,
						timestamp:
							m.receivedDate || m.timestamp || m.time || m.date || new Date().toISOString(),
						level: level,
						channel: ch.name,
						message: m.content || m.raw || m.transformed || 'No message content',

						// Basic Message Information
						messageId: m.id,
						channelId: ch.id,
						serverId: m.serverId,
						receivedDate: m.receivedDate || m.timestamp || m.time || m.date,
						status: m.status,
						processed: m.processed,

						// Connector Information
						connectorName: m.connectorName,
						connectorType: m.connectorType,
						errorCode: m.errorCode,
						sendAttempts: m.sendAttempts,
						chainId: m.chainId,
						orderId: m.orderId,

						// Message Content
						rawContent: m.raw,
						transformedContent: m.transformed,
						encodedContent: m.encoded,
						responseContent: m.response,
						responseTransformed: m.responseTransformed,
						responseEncoded: m.responseEncoded,

						// Processing Details
						processingErrorContent: m.processingErrorContent,
						postProcessorErrorContent: m.postProcessorErrorContent,
						responseErrorContent: m.responseErrorContent,
						metaDataMap: m.metaDataMap,

						// Additional fields
						correlationId: m.correlationId,
						sequenceId: m.sequenceId,
						error: m.error,

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

				console.log(`🔍 Channel ${ch.name} processed into ${channelResults.length} results`);
				return channelResults;
			} catch (err) {
				// Continue other channels even if one fails
				const emsg = /** @type {any} */ (err)?.message;
				console.warn('⚠️ Failed to load messages for channel', ch?.id || ch?.name, emsg);
				return []; // Return empty array for failed channels
			}
		});

		// Wait for all channels to complete processing
		const allChannelResults = (await Promise.all(channelPromises)).flat();
		console.log('🔍 All channel results:', allChannelResults.length, 'total results');

		// Aggregate results from all channels
		for (const channelResult of allChannelResults) {
			const target = ensureDay(channelResult.dayString);
			target.stats.total += 1;

			if (target.stats[channelResult.level] !== undefined) {
				target.stats[channelResult.level] += 1;
			} else {
				target.stats.INFO += 1; // Default to INFO for unknown levels
			}

			// Enforce per-day limit of 1200 messages while aggregating
			if (target.messages.length < 1200) {
				target.messages.push(channelResult.transformedMessage);
			}
		}

		// Convert map to sorted array and sort messages within each day
		const daysList = Array.from(dayMap.values())
			.map((day) => ({
				...day,
				messages: day.messages
					.sort(
						(/** @type {{ timestamp: string }} */ a, /** @type {{ timestamp: string }} */ b) =>
							new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
					)
					.slice(0, 1200) // safety slice to max 1200 per day
			}))
			.sort((/** @type {{ date: string }} */ a, /** @type {{ date: string }} */ b) =>
				a.date.localeCompare(b.date)
			);

		// Warm the in-memory cache for all days with their messages
		warmCache(daysList.map((d) => ({ date: d.date, messages: d.messages })));
		const duration = Date.now() - startTime;

		const totalMessages = daysList.reduce((sum, day) => sum + day.messages.length, 0);

		console.log(
			`🚀 Message days API completed in ${duration}ms for ${channels.length} channels, ${daysList.length} days, ${totalMessages} messages`
		);

		// Send days without the large messages payload to keep payload small
		const slimDays = daysList.map(({ date, formattedDate, stats }) => ({
			date,
			formattedDate,
			stats
		}));

		return json({
			success: true,
			days: slimDays,
			totalDays: slimDays.length,
			totalChannels: channels.length,
			totalMessages,
			range: { start: start.toISOString(), end: end.toISOString() },
			daysWindow: days,
			performance: { duration }
		});
	} catch (error) {
		const emsg = /** @type {any} */ (error)?.message;
		console.error('❌ Error fetching message days:', emsg);
		return json(
			{ success: false, error: 'Failed to aggregate message days', details: emsg },
			{ status: 500 }
		);
	}
}
