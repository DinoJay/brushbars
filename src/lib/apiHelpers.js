import fs from 'fs';
import path from 'path';
import * as d3 from 'd3';
import https from 'https';
import http from 'http';
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
// Internal shared parser that adapts behavior by mode
function coreParseLogLines(logText, mode = 'dev') {
	const result = [];
	const lines = logText
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);

	let counter = 0;
	let filteredCount = 0;

	const mainRegex =
		/^(INFO|ERROR|WARN|DEBUG|WARNING|FATAL|TRACE)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+\[([^\]]+)]\s+(\w+):\s+(.*)$/;

	for (const line of lines) {
		const m = line.match(mainRegex);
		const useAlt = !m;
		const altRegex =
			/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(INFO|ERROR|WARN|DEBUG|WARNING|FATAL|TRACE)\s+\[([^\]]+)]\s+(.*)$/;

		if (m || (useAlt && altRegex.test(line))) {
			const [, tsA, lvlA, ctxA, loggerOrMsgA, msgMaybe] = m
				? [null, m[2], m[1], m[3], m[4], m[5]]
				: [
						null,
						line.match(altRegex)[1],
						line.match(altRegex)[2],
						line.match(altRegex)[3],
						null,
						line.match(altRegex)[4]
					];

			const levelRaw = (m ? lvlA : lvlA).toUpperCase();
			const timestamp = tsA.includes('.') ? tsA : tsA + '.000';
			const contextInfo = parseContext(ctxA);
			const messageInfo = parseMessage(msgMaybe, levelRaw);

			// Derive final level per mode (messages prefer status mapping)
			const levelFinal =
				mode === 'messages'
					? String(messageInfo.status || levelRaw || 'INFO').toUpperCase()
					: levelRaw;

			result.push({
				id: counter++,
				level: levelFinal,
				timestamp,
				channel: contextInfo.channel,
				message: msgMaybe,
				status: messageInfo.status,

				// Extended, channel, processing, perf, network, error fields unchanged
				threadId: contextInfo.threadId,
				userId: contextInfo.userId,
				sessionId: contextInfo.sessionId,
				correlationId: contextInfo.correlationId,
				sourceIp: contextInfo.sourceIp,
				destinationIp: contextInfo.destinationIp,

				channelName: contextInfo.channelName,
				channelVersion: contextInfo.channelVersion,
				connectorType: contextInfo.connectorType,
				connectorName: contextInfo.connectorName,
				channelId: contextInfo.channelId,
				channelStatus: contextInfo.channelStatus,

				messageId: messageInfo.messageId,
				processingTime: messageInfo.processingTime,
				queueSize: messageInfo.queueSize,
				memoryUsage: messageInfo.memoryUsage,
				cpuUsage: messageInfo.cpuUsage,
				processingStatus: messageInfo.processingStatus,

				responseTime: messageInfo.responseTime,
				throughput: messageInfo.throughput,
				queueLatency: messageInfo.queueLatency,
				resourceUtilization: messageInfo.resourceUtilization,
				avgProcessingTime: messageInfo.avgProcessingTime,
				peakMemoryUsage: messageInfo.peakMemoryUsage,

				protocol: messageInfo.protocol,
				sourcePort: messageInfo.sourcePort,
				destinationPort: messageInfo.destinationPort,
				connectionStatus: messageInfo.connectionStatus,
				networkLatency: messageInfo.networkLatency,
				connectionType: messageInfo.connectionType,

				exceptionType: messageInfo.exceptionType,
				stackTrace: messageInfo.stackTrace,
				errorCode: messageInfo.errorCode,
				retryCount: messageInfo.retryCount,
				lastError: messageInfo.lastError,
				errorDetails: messageInfo.errorDetails,

				processingType: contextInfo.processingType,
				destinationNumber: contextInfo.destinationNumber,
				sqlQuery: messageInfo.sqlQuery,
				patientInfo: messageInfo.patientInfo,
				hl7Message: messageInfo.hl7Message
			});
		} else {
			filteredCount++;
			if (filteredCount <= 5) {
				console.warn('⚠️ Skipping malformed log line:', line.substring(0, 100));
			}
		}
	}
	return result;
}

// Dedicated entry points
export function parseDevLogLines(logText) {
	return coreParseLogLines(logText, 'dev');
}

export function parseMessageLogLines(logText) {
	return coreParseLogLines(logText, 'messages');
}

// Backward-compatible wrapper (default to dev logs)
export function parseLogLines(logText, kind = 'dev') {
	return kind === 'messages' ? parseMessageLogLines(logText) : parseDevLogLines(logText);
}

// Enhanced context parsing function
function parseContext(context) {
	const result = {
		channel: '(unknown)',
		threadId: null,
		userId: null,
		sessionId: null,
		correlationId: null,
		sourceIp: null,
		destinationIp: null,
		channelName: null,
		channelVersion: null,
		connectorType: null,
		connectorName: null,
		channelId: null,
		channelStatus: null,
		processingType: null,
		destinationNumber: null
	};

	try {
		// Extract channel information: "Destination Filter/Transformer JavaScript Task on ADT_QRY19 (a5a398c3-6fd8-4866-bc93-2924e3ac5f0d), Destination 1 (1)"
		const channelMatch = context.match(/on (\S+?) \(([^)]+)\)/);
		if (channelMatch) {
			result.channel = channelMatch[1];
			result.channelId = channelMatch[2];
		}

		// Extract thread information: "pool-1-thread-94"
		const threadMatch = context.match(/< ([^>]+)$/);
		if (threadMatch) {
			result.threadId = threadMatch[1];
		}

		// Extract processing type: "Destination Filter/Transformer JavaScript Task"
		const processingMatch = context.match(/^([^/]+)/);
		if (processingMatch) {
			result.processingType = processingMatch[1].trim();
		}

		// Extract destination information: "Destination 1 (1)"
		const destMatch = context.match(/(Destination \d+ \(\d+\))/);
		if (destMatch) {
			result.destinationNumber = destMatch[1];
			result.connectorName = destMatch[1];
		}

		// Extract connector type from processing type
		if (result.processingType) {
			if (result.processingType.includes('Source')) {
				result.connectorType = 'Source';
			} else if (result.processingType.includes('Destination')) {
				result.connectorType = 'Destination';
			} else if (result.processingType.includes('Filter')) {
				result.connectorType = 'Filter';
			} else if (result.processingType.includes('Transformer')) {
				result.connectorType = 'Transformer';
			}
		}

		// Set channel name and status
		result.channelName = result.channel;
		result.channelStatus = 'ACTIVE'; // Default assumption
	} catch (error) {
		console.warn('⚠️ Error parsing context:', context, error);
	}

	return result;
}

// Enhanced message parsing function
function parseMessage(message, level) {
	const result = {
		status: 'INFO',
		messageId: null,
		processingTime: null,
		queueSize: null,
		memoryUsage: null,
		cpuUsage: null,
		processingStatus: null,
		responseTime: null,
		throughput: null,
		queueLatency: null,
		resourceUtilization: null,
		avgProcessingTime: null,
		peakMemoryUsage: null,
		protocol: null,
		sourcePort: null,
		destinationPort: null,
		connectionStatus: null,
		networkLatency: null,
		connectionType: null,
		exceptionType: null,
		stackTrace: null,
		errorCode: null,
		retryCount: null,
		lastError: null,
		errorDetails: null,
		sqlQuery: null,
		patientInfo: null,
		hl7Message: null
	};

	try {
		// Set status based on level
		if (level === 'ERROR') {
			result.status = 'ERROR';
		} else if (level === 'WARN' || level === 'WARNING') {
			result.status = 'WARNING';
		} else if (level === 'INFO') {
			result.status = 'INFO';
		} else if (level === 'DEBUG') {
			result.status = 'DEBUG';
		}

		// Extract SQL queries
		const sqlMatch = message.match(/SQL [^:]+: (.+?)(?:\s|$)/);
		if (sqlMatch) {
			result.sqlQuery = sqlMatch[1];
		}

		// Extract patient information
		const patientMatch = message.match(/Signalétique récupérée : (.+?)(?:\s|$)/);
		if (patientMatch) {
			result.patientInfo = patientMatch[1];
		}

		// Extract HL7 message information
		const hl7Match = message.match(/(?:QRY\^A19|ADR\^A19) (.+?)(?:\s|$)/);
		if (hl7Match) {
			result.hl7Message = hl7Match[1];
		}

		// Extract error information for ERROR level logs
		if (level === 'ERROR') {
			// Extract Java exception type
			const exceptionMatch = message.match(/JavaException: ([^:]+)/);
			if (exceptionMatch) {
				result.exceptionType = exceptionMatch[1];
			}

			// Extract error details
			const errorMatch = message.match(
				/Erreur JDBC lors de la résolution NSEJ\/CBMRN : (.+?)(?:\s|$)/
			);
			if (errorMatch) {
				result.errorDetails = errorMatch[1];
			}

			// Extract SQL error codes
			const sqlErrorMatch = message.match(/\[SQL(\d+)\]/);
			if (sqlErrorMatch) {
				result.errorCode = `SQL${sqlErrorMatch[1]}`;
			}
		}

		// Extract processing status
		if (message.includes('statut = OK')) {
			result.processingStatus = 'COMPLETED';
		} else if (message.includes('statut = AE')) {
			result.processingStatus = 'ERROR';
		} else if (message.includes('received for')) {
			result.processingStatus = 'RECEIVED';
		}

		// Extract message IDs (CBMRN, NSEJ)
		const cbMrnMatch = message.match(/CBMRN: (\S+)/);
		if (cbMrnMatch) {
			result.messageId = `CBMRN_${cbMrnMatch[1]}`;
		}

		const nsejMatch = message.match(/NSEJ: (\S+)/);
		if (nsejMatch) {
			result.messageId = result.messageId
				? `${result.messageId}_NSEJ_${nsejMatch[1]}`
				: `NSEJ_${nsejMatch[1]}`;
		}
	} catch (error) {
		console.warn('⚠️ Error parsing message:', message, error);
	}

	return result;
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
	timeout: 10000,
	useHttps: process.env.MIRTH_HTTPS !== 'false' // Default to HTTPS
};

// Session cookie for authentication
let sessionCookie = '';

// Set SSL certificate handling globally for development
if (typeof process !== 'undefined' && process.env) {
	// Disable SSL certificate verification for development
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Helper function to make HTTP/HTTPS requests
function makeHttpRequest(options, postData = null) {
	return new Promise((resolve, reject) => {
		const protocol = MIRTH_CONFIG.useHttps ? https : http;
		const req = protocol.request(options, (res) => {
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

	const { body } = await makeHttpRequest(requestOptions, postData);

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
		console.log(
			`🔍 Connecting to: ${MIRTH_CONFIG.useHttps ? 'HTTPS' : 'HTTP'}://${MIRTH_CONFIG.hostname}:${MIRTH_CONFIG.port}`
		);
		console.log(`🔍 Username: ${MIRTH_CONFIG.username}`);

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

			// Parse XML using D3
			const xmlDoc = parseXmlWithD3(response);
			if (!xmlDoc) {
				console.log('⚠️ Failed to parse XML response, using example data');
				return exampleChannels;
			}

			// Find all channel elements
			const channelElements = xmlDoc.querySelectorAll('channel');
			if (channelElements && channelElements.length > 0) {
				console.log(`✅ Found ${channelElements.length} channels in XML response`);

				// Parse each channel element
				return Array.from(channelElements).map((channelElement, index) => {
					const id = getXmlText(channelElement, 'id', `channel-${index}`);
					const name = getXmlText(channelElement, 'name', `Channel ${index + 1}`);
					const description = getXmlText(channelElement, 'description', '');
					const enabled = getXmlBoolean(channelElement, 'enabled', true);

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
		// When not in ATHOME mode, fail with error instead of falling back to examples
		throw new Error(
			`Failed to connect to Mirth Connect server at ${MIRTH_CONFIG.useHttps ? 'HTTPS' : 'HTTP'}://${MIRTH_CONFIG.hostname}:${MIRTH_CONFIG.port}. Check your server configuration and network connectivity. Original error: ${error.message}`
		);
	}
}

// Helper function to format dates for Mirth Connect API
function formatDateForMirth(date) {
	// Convert to local timezone offset (no Z, use actual offset like -0700)
	const offset = date.getTimezoneOffset();
	const offsetHours = Math.abs(Math.floor(offset / 60));
	const offsetMinutes = Math.abs(offset % 60);
	const offsetSign = offset <= 0 ? '+' : '-';

	// Format: YYYY-MM-DDTHH:mm:ss.SSS±HHMM (like 1985-10-26T09:00:00.000-0700)
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${String(offsetHours).padStart(2, '0')}${String(offsetMinutes).padStart(2, '0')}`;
}

// Helper function to parse XML using D3
function parseXmlWithD3(xmlString) {
	try {
		// Use D3's XML parser for Node.js environment
		const xmlDoc = d3.xmlParse(xmlString);

		// Check for parsing errors
		if (!xmlDoc || xmlDoc.querySelector('parsererror')) {
			console.warn('⚠️ XML parsing error detected');
			return null;
		}

		return xmlDoc;
	} catch (error) {
		console.warn('⚠️ Failed to parse XML with D3:', error);
		return null;
	}
}

// Helper function to safely get text content from XML element
function getXmlText(element, tagName, defaultValue = '') {
	if (!element) return defaultValue;
	const tag = element.querySelector(tagName);
	return tag ? tag.textContent.trim() : defaultValue;
}

// Helper function to safely get attribute from XML element
function getXmlAttribute(element, attributeName, defaultValue = '') {
	if (!element) return defaultValue;
	return element.getAttribute(attributeName) || defaultValue;
}

// Helper function to safely get boolean from XML element
function getXmlBoolean(element, tagName, defaultValue = false) {
	const value = getXmlText(element, tagName, String(defaultValue));
	return value === 'true';
}

// Helper function to safely get integer from XML element
function getXmlInteger(element, tagName, defaultValue = 0) {
	const value = getXmlText(element, tagName, String(defaultValue));
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
}

// Get messages for a specific channel
export async function getChannelMessages(channelId, options = {}) {
	const { startDate, endDate, limit = 500000, offset = 0, includeContent = false } = options;

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

		// Format dates for Mirth Connect API
		if (startDate) {
			const formattedStartDate = formatDateForMirth(new Date(startDate));
			endpoint += `&startDate=${encodeURIComponent(formattedStartDate)}`;
		}
		if (endDate) {
			const formattedEndDate = formatDateForMirth(new Date(endDate));
			endpoint += `&endDate=${encodeURIComponent(formattedEndDate)}`;
		}
		if (includeContent) {
			endpoint += '&includeContent=true';
		}

		console.log(`🔍 Fetching messages from: ${endpoint}`);
		const response = await mirthApiRequest(endpoint);

		// Debug the response structure
		console.log('🔍 Response type:', typeof response);
		// console.log('�� Response structure:', response);

		// Handle different response formats from Mirth Connect
		let messages = [];
		if (Array.isArray(response)) {
			// Direct array response
			messages = response;
		} else if (response && typeof response === 'object') {
			// Object response - check common properties
			if (response.list && Array.isArray(response.list)) {
				messages = response.list;
			} else if (response.messages && Array.isArray(response.messages)) {
				messages = response.messages;
			} else if (response.data && Array.isArray(response.data)) {
				messages = response.data;
			} else if (response.items && Array.isArray(response.items)) {
				messages = response.items;
			} else {
				console.warn('⚠️ Unexpected response structure, no messages array found:', response);
				return [];
			}
		} else if (typeof response === 'string') {
			// XML response - try to parse
			console.log('⚠️ Received XML response, attempting to parse...');
			console.log('🔍 XML response starts with:', response.substring(0, 200));
			console.log('🔍 XML response ends with:', response.substring(response.length - 200));

			// Check if it's an error response
			if (response.includes('<error>') || response.includes('Request failed')) {
				console.log('⚠️ Server error response detected');
				return [];
			}

			// Try to extract message information from XML
			console.log('🔍 Looking for message tags in XML response...');
			const messageMatches = response.match(/<message[^>]*>[\s\S]*?<\/message>/g);
			console.log('🔍 Message regex matches:', messageMatches ? messageMatches.length : 0);
			if (messageMatches) {
				console.log(`✅ Found ${messageMatches.length} messages in XML response`);

				// Parse each message XML block
				messages = messageMatches.map((messageXml, index) => {
					// Extract message ID
					const idMatch = messageXml.match(/<id>([^<]+)<\/id>/);
					const id = idMatch ? idMatch[1] : `msg-${index}`;

					// Extract server ID
					const serverIdMatch = messageXml.match(/<serverId>([^<]+)<\/serverId>/);
					const serverId = serverIdMatch ? serverIdMatch[1] : null;

					// Extract received date from Mirth's nested XML structure
					const timeMatch = messageXml.match(/<time>([^<]+)<\/time>/);
					const receivedDate = timeMatch
						? new Date(parseInt(timeMatch[1])).toISOString() // Convert Unix timestamp to ISO
						: new Date().toISOString();

					// Extract status
					const statusMatch = messageXml.match(/<status>([^<]+)<\/status>/);
					const status = statusMatch ? statusMatch[1] : 'UNKNOWN';

					// Extract processed status
					const processedMatch = messageXml.match(/<processed>([^<]+)<\/processed>/);
					const processed = processedMatch ? processedMatch[1] === 'true' : false;

					// Extract connector message details
					const connectorMessageMatch = messageXml.match(
						/<connectorMessage>([\s\S]*?)<\/connectorMessage>/
					);
					let connectorName = 'Unknown';
					let connectorType = 'Unknown';
					let errorCode = null;
					let sendAttempts = 0;
					let chainId = 0;
					let orderId = 0;

					if (connectorMessageMatch) {
						const connectorXml = connectorMessageMatch[1];

						// Extract connector name
						const connectorNameMatch = connectorXml.match(
							/<connectorName>([^<]*)<\/connectorName>/
						);
						connectorName = connectorNameMatch ? connectorNameMatch[1] : 'Unknown';

						// Extract error code
						const errorCodeMatch = connectorXml.match(/<errorCode>([^<]+)<\/errorCode>/);
						errorCode = errorCodeMatch ? errorCodeMatch[1] : null;

						// Extract send attempts
						const sendAttemptsMatch = connectorXml.match(/<sendAttempts>([^<]+)<\/sendAttempts>/);
						sendAttempts = sendAttemptsMatch ? parseInt(sendAttemptsMatch[1]) : 0;

						// Extract chain ID
						const chainIdMatch = connectorXml.match(/<chainId>([^<]+)<\/chainId>/);
						chainId = chainIdMatch ? parseInt(chainIdMatch[1]) : 0;

						// Extract order ID
						const orderIdMatch = connectorXml.match(/<orderId>([^<]+)<\/orderId>/);
						orderId = orderIdMatch ? parseInt(orderIdMatch[1]) : 0;
					}

					// Extract content maps
					const sourceMapMatch = messageXml.match(
						/<sourceMapContent>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/
					);
					const rawContent = sourceMapMatch ? sourceMapMatch[1].trim() : null;

					const transformedMapMatch = messageXml.match(
						/<connectorMapContent>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/
					);
					const transformedContent = transformedMapMatch ? transformedMapMatch[1].trim() : null;

					const encodedMapMatch = messageXml.match(
						/<channelMapContent>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/
					);
					const encodedContent = encodedMapMatch ? encodedMapMatch[1].trim() : null;

					const responseMapMatch = messageXml.match(
						/<responseMapContent>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/
					);
					const responseContent = responseMapMatch ? responseMapMatch[1].trim() : null;

					// Extract error content
					const processingErrorMatch = messageXml.match(
						/<processingErrorContent>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/
					);
					const processingErrorContent = processingErrorMatch
						? processingErrorMatch[1].trim()
						: null;

					const postProcessorErrorMatch = messageXml.match(
						/<postProcessorErrorContent>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/
					);
					const postProcessorErrorContent = postProcessorErrorMatch
						? postProcessorErrorMatch[1].trim()
						: null;

					const responseErrorMatch = messageXml.match(
						/<responseErrorContent>[\s\S]*?<content[^>]*>([\s\S]*?)<\/content>/
					);
					const responseErrorContent = responseErrorMatch ? responseErrorMatch[1].trim() : null;

					// Extract metadata
					const metaDataMatch = messageXml.match(/<metaDataMap>([\s\S]*?)<\/metaDataMap>/);
					const metaDataMap = metaDataMatch ? metaDataMatch[1].trim() : null;

					return {
						id,
						channelId,
						channelName: 'Unknown Channel',
						receivedDate,
						processed,
						status,

						// Basic Message Information
						serverId,

						// Connector Information
						connectorName,
						connectorType,
						errorCode,
						sendAttempts,
						chainId,
						orderId,

						// Message Content
						content: rawContent,
						raw: rawContent,
						transformed: transformedContent,
						encoded: encodedContent,
						response: responseContent,
						responseTransformed: null, // Not directly available in XML
						responseEncoded: null, // Not directly available in XML

						// Processing Details
						processingErrorContent,
						postProcessorErrorContent,
						responseErrorContent,
						metaDataMap,

						// Additional fields
						error: processingErrorContent || responseErrorContent,
						correlationId: null, // Not directly available in XML
						sequenceId: null // Not directly available in XML
					};
				});
			} else {
				console.log('⚠️ No message tags found in XML response');
				return [];
			}
		} else {
			console.warn('⚠️ Unexpected response type:', typeof response);
			return [];
		}

		console.log(`✅ Found ${messages.length} messages in response`);

		return messages;
	} catch (error) {
		console.error(`❌ Failed to fetch messages for channel ${channelId}:`, error);
		// When not in ATHOME mode, fail with error instead of falling back to examples
		throw new Error(
			`Failed to fetch messages for channel ${channelId} from Mirth Connect server. Check your server configuration and network connectivity. Original error: ${error.message}`
		);
	}
}

// ... existing code ...

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

		// Format dates for Mirth Connect API
		const formattedStartDate = formatDateForMirth(new Date(startDate));
		const formattedEndDate = formatDateForMirth(new Date(endDate));

		const endpoint = `/api/channels/${channelId}/messages/statistics?startDate=${encodeURIComponent(formattedStartDate)}&endDate=${encodeURIComponent(formattedEndDate)}`;
		console.log(`🔍 Fetching stats from: ${endpoint}`);

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
		// When not in ATHOME mode, fail with error instead of falling back to examples
		throw new Error(
			`Failed to fetch message stats for channel ${channelId} from Mirth Connect server. Check your server configuration and network connectivity. Original error: ${error.message}`
		);
	}
}

// ... existing code ...
