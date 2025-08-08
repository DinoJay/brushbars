import fs from 'fs';
import path from 'path';
import * as d3 from 'd3';
import https from 'https';
import { stringify } from 'querystring';

// Import example data for fallback
import {
	exampleChannels,
	generateChannelMessages,
	generateChannelStats
} from './exampleData/mirthChannelsData.js';

// Path to the all-logs.txt file
export const ALL_LOGS_PATH = path.join(process.cwd(), 'server', 'all-logs.txt');
const EXAMPLE_LOGS_DIR = path.join(process.cwd(), 'src', 'lib', 'exampleData');

// Environment flag: only use example data when running "at home"
const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';

// Generate example logs for testing when Mirth logs are not available
function generateExampleLogs() {
	const now = new Date();
	const logs = [];

	for (let i = 0; i < 100; i++) {
		const timestamp = new Date(now.getTime() - i * 60000); // Each log 1 minute apart
		const levels = ['INFO', 'ERROR', 'WARN', 'DEBUG'];
		const level = levels[Math.floor(Math.random() * levels.length)];
		const channels = ['Channel1', 'Channel2', 'Channel3', 'Channel4'];
		const channel = channels[Math.floor(Math.random() * channels.length)];

		logs.push({
			id: i,
			level,
			timestamp: timestamp.toISOString().replace('T', ' ').replace('Z', ''),
			channel,
			message: `Example log message ${i} from ${channel}`
		});
	}

	return logs;
}

// Log parsing function (shared across all API endpoints)
export function parseLogLines(logText) {
	const result = [];
	const lines = logText
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	let counter = 0;
	let filteredCount = 0;

	// Improved regex to handle more log formats
	const regex =
		/^(INFO|ERROR|WARN|DEBUG|WARNING|FATAL|TRACE)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+\[([^\]]+)]\s+(\w+):\s+(.*)$/;

	for (const line of lines) {
		const match = line.match(regex);
		if (match) {
			const [, level, timestamp, context, logger, message] = match;
			const channelMatch = context.match(/ on (\S+?) \(/);
			const channel = channelMatch ? channelMatch[1] : '(unknown)';

			// Normalize timestamp format (add .000 if milliseconds missing)
			let normalizedTimestamp = timestamp;
			if (!timestamp.includes('.')) {
				normalizedTimestamp = timestamp + '.000';
			}

			result.push({
				id: counter++,
				level: level.toUpperCase(),
				timestamp: normalizedTimestamp,
				channel,
				message
			});
		} else {
			// Try alternative regex patterns for different log formats
			const altRegex1 =
				/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(INFO|ERROR|WARN|DEBUG|WARNING|FATAL|TRACE)\s+\[([^\]]+)]\s+(.*)$/;
			const altMatch1 = line.match(altRegex1);

			if (altMatch1) {
				const [, timestamp, level, context, message] = altMatch1;
				const channelMatch = context.match(/ on (\S+?) \(/);
				const channel = channelMatch ? channelMatch[1] : '(unknown)';

				let normalizedTimestamp = timestamp;
				if (!timestamp.includes('.')) {
					normalizedTimestamp = timestamp + '.000';
				}

				result.push({
					id: counter++,
					level: level.toUpperCase(),
					timestamp: normalizedTimestamp,
					channel,
					message
				});
			} else {
				// Skip lines that don't match any pattern
				filteredCount++;
				if (filteredCount <= 5) {
					console.warn('⚠️ Skipping malformed log line:', line.substring(0, 100));
				}
			}
		}
	}

	// Filter out any entries with empty timestamps (defensive)
	const validEntries = result.filter((entry) => {
		if (!entry.timestamp || entry.timestamp.trim() === '') {
			filteredCount++;
			return false;
		}
		return true;
	});

	if (filteredCount > 0) {
		console.log(`📊 Filtered out ${filteredCount} entries with invalid/missing timestamps`);
	}

	return validEntries;
}

// Load logs from all-logs.txt file
// Loads all logs from all files in the mirth logs directory
export function loadLogsFromFile() {
	const startTime = Date.now();

	// Define the Mirth logs directory - always use production logs
	const MIRTH_LOGS_DIR = 'C:\\Program Files\\Mirth Connect\\logs';

	try {
		// If at home, force example logs from repo and skip real dir
		if (IS_ATHOME) {
			if (fs.existsSync(EXAMPLE_LOGS_DIR)) {
				const files = fs.readdirSync(EXAMPLE_LOGS_DIR);
				const logFiles = files.filter((file) => /^mirth\.log(\.|$)/i.test(file));
				if (logFiles.length > 0) {
					let allLogText = '';
					for (const file of logFiles) {
						const filePath = path.join(EXAMPLE_LOGS_DIR, file);
						try {
							const logText = fs.readFileSync(filePath, 'utf8');
							allLogText += logText + '\n';
						} catch (err) {
							console.warn(`⚠️ Failed to read example log file: ${filePath}`, err);
						}
					}
					const logs = parseLogLines(allLogText);
					const endTime = Date.now();
					console.log(
						`📊 Loaded ${logs.length} example logs in ${endTime - startTime}ms from ${logFiles.length} files in ${EXAMPLE_LOGS_DIR}`
					);
					return logs;
				}
			}
			console.warn(
				'⚠️ ATHOME is true but no example logs found. Falling back to generated example logs.'
			);
			return generateExampleLogs();
		}

		// Not at home: prefer real logs; do not fallback to example
		if (fs.existsSync(MIRTH_LOGS_DIR)) {
			const files = fs.readdirSync(MIRTH_LOGS_DIR);
			const logFiles = files.filter(
				(file) =>
					/^mirth\.log/i.test(file) ||
					file.endsWith('.log') ||
					(file.includes('mirth') && file.includes('log'))
			);
			if (logFiles.length > 0) {
				let allLogText = '';
				for (const file of logFiles) {
					const filePath = path.join(MIRTH_LOGS_DIR, file);
					try {
						const logText = fs.readFileSync(filePath, 'utf8');
						allLogText += logText + '\n';
					} catch (err) {
						console.warn(`⚠️ Failed to read log file: ${filePath}`, err);
					}
				}
				const logs = parseLogLines(allLogText);
				const endTime = Date.now();
				console.log(
					`📊 Loaded ${logs.length} logs in ${endTime - startTime}ms from ${logFiles.length} files in ${MIRTH_LOGS_DIR}`
				);
				return logs;
			}
		}
		console.warn('⚠️ No real log files found. Returning empty logs (not in ATHOME mode).');
		return [];
	} catch (error) {
		console.error('❌ Error loading logs from Mirth log files:', error);
		return [];
	}
}

// Helper function to group logs by day
export function groupLogsByDay(logs) {
	const startTime = Date.now();
	const dayMap = new Map();

	// Pre-allocate stats object to avoid repeated object creation
	const createStats = () => ({
		total: 0,
		INFO: 0,
		ERROR: 0,
		WARN: 0,
		DEBUG: 0,
		WARNING: 0,
		FATAL: 0,
		TRACE: 0
	});

	for (const log of logs) {
		const logDate = new Date(log.timestamp);
		const dayKey = d3.timeDay.floor(logDate);
		const dayString = d3.timeFormat('%Y-%m-%d')(dayKey);

		if (!dayMap.has(dayString)) {
			dayMap.set(dayString, {
				date: dayString,
				logs: [],
				stats: createStats()
			});
		}

		const dayData = dayMap.get(dayString);
		dayData.logs.push(log);
		dayData.stats.total++;
		dayData.stats[log.level] = (dayData.stats[log.level] || 0) + 1;
	}

	const result = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

	const endTime = Date.now();
	console.log(
		`📊 Grouped ${logs.length} logs into ${result.length} days in ${endTime - startTime}ms`
	);

	return result;
}

// Mirth Connect API configuration
const MIRTH_CONFIG = {
	hostname: process.env.MIRTH_HOST || 'brberdev',
	port: parseInt(process.env.MIRTH_PORT) || 5443,
	username: process.env.MIRTH_USERNAME || 'admin',
	password: process.env.MIRTH_PASSWORD || 'admin2024',
	timeout: 10000
};

// Session cookie for authentication
let sessionCookie = '';

// Set SSL certificate handling globally for development
if (typeof process !== 'undefined' && process.env) {
	// Disable SSL certificate verification for development
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Helper function to make HTTPS requests
function makeHttpsRequest(options, postData = null) {
	return new Promise((resolve, reject) => {
		const req = https.request(options, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				resolve({
					statusCode: res.statusCode,
					headers: res.headers,
					body: data
				});
			});
		});

		req.on('error', reject);

		if (postData) req.write(postData);
		req.end();
	});
}

// Helper function to authenticate with Mirth Connect API
async function authenticateMirth() {
	try {
		console.log('🔐 Authenticating with Mirth Connect...');

		const postData = stringify({
			username: MIRTH_CONFIG.username,
			password: MIRTH_CONFIG.password
		});

		const options = {
			hostname: MIRTH_CONFIG.hostname,
			port: MIRTH_CONFIG.port,
			path: '/api/users/_login',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		const { statusCode, headers, body } = await makeHttpsRequest(options, postData);
		console.log(`🔍 Login response - Status: ${statusCode}`);
		console.log(`🔍 Login response - Headers:`, Object.keys(headers));
		console.log(`🔍 Login response - Body:`, body.substring(0, 200));

		const cookieHeader = headers['set-cookie'];
		if (!cookieHeader) {
			console.log('⚠️ No set-cookie header found in response');
			console.log('🔍 Available headers:', Object.keys(headers));
			throw new Error('No session cookie found in response');
		}
		sessionCookie = cookieHeader[0].split(';')[0];
		console.log('✅ Authentication successful');
		return true;
	} catch (error) {
		console.error('❌ Mirth authentication failed:', error);
		return false;
	}
}

// Helper function to make authenticated requests to Mirth API
async function mirthApiRequest(endpoint, options = {}) {
	// Use Basic Authentication instead of session cookies
	const auth = Buffer.from(`${MIRTH_CONFIG.username}:${MIRTH_CONFIG.password}`).toString('base64');

	const requestOptions = {
		hostname: MIRTH_CONFIG.hostname,
		port: MIRTH_CONFIG.port,
		path: endpoint,
		method: options.method || 'GET',
		headers: {
			Authorization: `Basic ${auth}`,
			'X-Requested-With': 'OpenAPI',
			accept: 'application/xml', // Match your working curl command exactly
			...options.headers
		}
	};

	// Add body for POST requests
	let postData = null;
	if (options.body) {
		postData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
		requestOptions.headers['Content-Type'] = 'application/json';
		requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
	}

	const { body } = await makeHttpsRequest(requestOptions, postData);

	// Try to parse as JSON first, if that fails, return the raw body
	try {
		return JSON.parse(body);
	} catch (error) {
		console.log('⚠️ Response is not JSON, returning raw body');
		return body;
	}
}

// Test function to diagnose Mirth connection issues
// Get all channels from Mirth Connect
export async function getMirthChannels() {
	try {
		if (IS_ATHOME) {
			console.log('🏠 ATHOME: returning example channels');
			return exampleChannels;
		}

		console.log('🔐 Fetching channels from Mirth Connect...');

		// Try the simple /api/channels endpoint without parameters
		const response = await mirthApiRequest('/api/channels');
		console.log('🔍 Response type:', typeof response);

		// Handle XML response (string) vs JSON response (object)
		if (typeof response === 'string') {
			console.log('🔍 Response is XML string, first 200 chars:', response.substring(0, 200));

			// Check if it's an error response (look for actual error structure)
			if (
				response.includes('<error>') ||
				(response.includes('Request failed') && response.includes('<servlet>'))
			) {
				console.log('⚠️ Server error response detected, using example data');
				return exampleChannels;
			}

			// Try to extract channel information from XML
			const channelMatches = response.match(/<channel[^>]*>[\s\S]*?<\/channel>/g);
			if (channelMatches) {
				console.log(`✅ Found ${channelMatches.length} channels in XML response`);

				// Parse each channel XML block
				return channelMatches.map((channelXml, index) => {
					// Extract channel ID
					const idMatch = channelXml.match(/<id>([^<]+)<\/id>/);
					const id = idMatch ? idMatch[1] : `channel-${index}`;

					// Extract channel name
					const nameMatch = channelXml.match(/<name>([^<]+)<\/name>/);
					const name = nameMatch ? nameMatch[1] : `Channel ${index + 1}`;

					// Extract description
					const descMatch = channelXml.match(/<description>([^<]*)<\/description>/);
					const description = descMatch ? descMatch[1] : '';

					// Extract enabled status
					const enabledMatch = channelXml.match(/<enabled>([^<]+)<\/enabled>/);
					const enabled = enabledMatch ? enabledMatch[1] === 'true' : true;

					return {
						id,
						name,
						description,
						enabled,
						lastModified: new Date().toISOString()
					};
				});
			} else {
				console.log('⚠️ No channel tags found in XML response, using example data');
				return exampleChannels;
			}
		} else {
			// Handle JSON response
			console.log('🔍 Response keys:', Object.keys(response));
			console.log('🔍 Response:', JSON.stringify(response, null, 2).substring(0, 500));

			// Handle different response structures
			let channels = [];
			if (Array.isArray(response)) {
				channels = response;
			} else if (response.list && Array.isArray(response.list)) {
				channels = response.list;
			} else if (response.channels && Array.isArray(response.channels)) {
				channels = response.channels;
			} else if (response.data && Array.isArray(response.data)) {
				channels = response.data;
			} else {
				console.log('⚠️ Unexpected response structure, using example data');
				return exampleChannels;
			}

			console.log(`✅ Successfully fetched ${channels.length} channels using /api/channels`);

			return channels.map((channel) => ({
				id: channel.id,
				name: channel.name,
				description: channel.description,
				enabled: channel.enabled,
				lastModified: channel.lastModified
			}));
		}
	} catch (error) {
		console.error('❌ Failed to fetch Mirth channels:', error);
		// Not ATHOME: propagate empty to let API layer return error
		throw error;
	}
}

// Get messages for a specific channel
export async function getChannelMessages(channelId, options = {}) {
	const { startDate, endDate, limit = 1000, offset = 0, includeContent = false } = options;

	try {
		if (IS_ATHOME) {
			const allMessages = generateChannelMessages(channelId, 30);
			let filteredMessages = allMessages;
			if (startDate) filteredMessages = filteredMessages.filter((m) => m.receivedDate >= startDate);
			if (endDate) filteredMessages = filteredMessages.filter((m) => m.receivedDate <= endDate);
			return filteredMessages.slice(offset, offset + limit);
		}

		// Try to get real data first
		let endpoint = `/api/channels/${channelId}/messages?limit=${limit}&offset=${offset}`;

		if (startDate) {
			endpoint += `&startDate=${encodeURIComponent(startDate)}`;
		}
		if (endDate) {
			endpoint += `&endDate=${encodeURIComponent(endDate)}`;
		}
		if (includeContent) {
			endpoint += '&includeContent=true';
		}

		const messages = await mirthApiRequest(endpoint);
		return messages.map((message) => ({
			id: message.id,
			channelId: message.channelId,
			channelName: message.channelName,
			receivedDate: message.receivedDate,
			processed: message.processed,
			status: message.status,
			connectorName: message.connectorName,
			connectorType: message.connectorType,
			content: includeContent ? message.content : null,
			raw: includeContent ? message.raw : null,
			transformed: includeContent ? message.transformed : null,
			encoded: includeContent ? message.encoded : null,
			response: includeContent ? message.response : null,
			responseTransformed: includeContent ? message.responseTransformed : null,
			responseEncoded: includeContent ? message.responseEncoded : null,
			error: message.error,
			correlationId: message.correlationId,
			sequenceId: message.sequenceId
		}));
	} catch (error) {
		console.error(`❌ Failed to fetch messages for channel ${channelId}:`, error);
		throw error;
	}
}

// Get message statistics for a channel
export async function getChannelMessageStats(channelId, startDate, endDate) {
	try {
		if (IS_ATHOME) {
			const allStats = generateChannelStats(channelId, 30);
			let filteredStats = allStats;
			if (startDate && endDate) {
				filteredStats = allStats.filter((s) => s.date >= startDate && s.date <= endDate);
			}
			const aggregated = filteredStats.reduce(
				(acc, stat) => {
					acc.total += stat.total;
					acc.processed += stat.processed;
					acc.failed += stat.failed;
					acc.pending += stat.pending;
					acc.queued += stat.queued;
					return acc;
				},
				{ total: 0, processed: 0, failed: 0, pending: 0, queued: 0 }
			);
			return {
				...aggregated,
				startDate: startDate || filteredStats[filteredStats.length - 1]?.date,
				endDate: endDate || filteredStats[0]?.date
			};
		}

		const endpoint = `/api/channels/${channelId}/messages/statistics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
		const stats = await mirthApiRequest(endpoint);

		return {
			total: stats.total,
			processed: stats.processed,
			failed: stats.failed,
			pending: stats.pending,
			queued: stats.queued,
			startDate: stats.startDate,
			endDate: stats.endDate
		};
	} catch (error) {
		console.error(`❌ Failed to fetch message stats for channel ${channelId}:`, error);
		throw error;
	}
}
