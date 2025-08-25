// @ts-nocheck
import fs from 'fs';
import path from 'path';
import * as d3 from 'd3';
import https from 'https';
import http from 'http';
import { XMLParser } from 'fast-xml-parser';

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
			// Extract Java exception type (multiple patterns)
			const exceptionMatch = message.match(/(?:JavaException|Java\.sql\.\w+Exception): ([^:]+)/);
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

			// Extract error description after the error code
			const errorDescMatch = message.match(/\[SQL\d+\]\s*(.+?)(?:\s|$)/);
			if (errorDescMatch) {
				result.errorDetails = errorDescMatch[1];
			}

			// Extract full exception message
			const fullExceptionMatch = message.match(/(?:JavaException|Java\.sql\.\w+Exception):\s*(.+)/);
			if (fullExceptionMatch) {
				result.exceptionType = fullExceptionMatch[1].split(':')[0];
				result.errorDetails = fullExceptionMatch[1].split(':').slice(1).join(':').trim();
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

	// Preferred log directories when not in ATHOME: UNC first, then local fallback
	const MIRTH_LOGS_DIRS = [
		'\\\\brberdev\\\\c$\\\\Program Files\\\\Mirth Connect\\\\logs',
		'C:\\Program Files\\Mirth Connect\\logs'
	];

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

		// Not at home: try UNC first, then local fallback
		let activeDir = null;
		for (const candidate of MIRTH_LOGS_DIRS) {
			try {
				if (fs.existsSync(candidate)) {
					activeDir = candidate;
					break;
				}
			} catch {}
		}

		if (activeDir) {
			const files = fs.readdirSync(activeDir);
			const logFiles = files.filter(
				(file) =>
					/^mirth\.log/i.test(file) ||
					file.endsWith('.log') ||
					(file.includes('mirth') && file.includes('log'))
			);
			if (logFiles.length > 0) {
				let allLogText = '';
				for (const file of logFiles) {
					const filePath = path.join(activeDir, file);
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
					`📊 Loaded ${logs.length} logs in ${endTime - startTime}ms from ${logFiles.length} files in ${activeDir}`
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

// Loads all logs from all files in a specified logs directory
export function loadLogsFromDirectory(directoryPath) {
	const startTime = Date.now();

	try {
		if (!directoryPath || typeof directoryPath !== 'string') {
			console.warn('⚠️ Invalid directoryPath provided to loadLogsFromDirectory');
			return [];
		}

		if (fs.existsSync(directoryPath)) {
			const files = fs.readdirSync(directoryPath);
			const logFiles = files.filter(
				(file) =>
					/^mirth\.log/i.test(file) ||
					file.endsWith('.log') ||
					(file.toLowerCase().includes('mirth') && file.toLowerCase().includes('log'))
			);
			if (logFiles.length > 0) {
				let allLogText = '';
				for (const file of logFiles) {
					const filePath = path.join(directoryPath, file);
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
					`📊 Loaded ${logs.length} logs in ${endTime - startTime}ms from ${logFiles.length} files in ${directoryPath}`
				);
				return logs;
			}
		}

		console.warn(`⚠️ No log files found in provided directory: ${directoryPath}`);
		return [];
	} catch (error) {
		console.error('❌ Error loading logs from provided directory:', error);
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

	// Helper function to format date
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		const today = new Date();
		const year = date.getFullYear();
		const month = date.toLocaleDateString('en-US', { month: 'short' });
		const day = date.getDate();

		// Only show year if it's different from current year
		if (year === today.getFullYear()) {
			return `${month} ${day}`;
		} else {
			return `${month} ${day}, ${year}`;
		}
	};

	for (const log of logs) {
		const logDate = new Date(log.timestamp);
		const dayKey = d3.timeDay.floor(logDate);
		const dayString = d3.timeFormat('%Y-%m-%d')(dayKey);

		if (!dayMap.has(dayString)) {
			dayMap.set(dayString, {
				date: dayString, // Always YYYY-MM-DD format
				formattedDate: formatDate(dayString), // Display text like "Aug 13"
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

			// Error signature detection
			if (
				response.includes('<error>') ||
				(response.includes('Request failed') && response.includes('<servlet>'))
			) {
				throw new Error('Mirth API returned an error response');
			}

			// Parse XML using fast-xml-parser
			const xmlObj = parseXmlWithFastParser(response);
			if (xmlObj) {
				// Normalize possible shapes: {channels:{channel:[...]}} or {list:{channel:[...]}} or array
				let list = [];
				if (Array.isArray(xmlObj)) list = xmlObj;
				else if (xmlObj.channels?.channel)
					list = Array.isArray(xmlObj.channels.channel)
						? xmlObj.channels.channel
						: [xmlObj.channels.channel];
				else if (xmlObj.list?.channel)
					list = Array.isArray(xmlObj.list.channel) ? xmlObj.list.channel : [xmlObj.list.channel];
				else if (xmlObj.channel)
					list = Array.isArray(xmlObj.channel) ? xmlObj.channel : [xmlObj.channel];

				if (list.length > 0) {
					console.log(`✅ Parsed ${list.length} channels from XML`);
					return list.map((c, index) => ({
						id: c.id || `channel-${index}`,
						name: c.name || `Channel ${index + 1}`,
						description: c.description || '',
						enabled: String(c.enabled) !== 'false',
						lastModified: new Date().toISOString()
					}));
				}
			}

			// Regex fallback
			const channelBlocks = response.match(/<channel[\s\S]*?<\/channel>/g) || [];
			if (channelBlocks.length > 0) {
				console.log(`✅ Parsed ${channelBlocks.length} channels via regex fallback`);
				return channelBlocks.map((block, index) => {
					const id = (block.match(/<id>([^<]+)<\/id>/) || [])[1] || `channel-${index}`;
					const name = (block.match(/<name>([^<]+)<\/name>/) || [])[1] || `Channel ${index + 1}`;
					const enabledText = (block.match(/<enabled>([^<]+)<\/enabled>/) || [])[1] || 'true';
					const enabled = enabledText === 'true';
					const description =
						(block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
					return { id, name, description, enabled, lastModified: new Date().toISOString() };
				});
			}

			throw new Error('No channel tags found in Mirth API XML response');
		} else {
			// JSON response
			let channels = [];
			if (Array.isArray(response)) channels = response;
			else if (response.list && Array.isArray(response.list)) channels = response.list;
			else if (response.channels && Array.isArray(response.channels)) channels = response.channels;
			else if (response.data && Array.isArray(response.data)) channels = response.data;
			else throw new Error('Unexpected channels response structure from Mirth API');

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
		throw new Error(
			`Failed to connect to Mirth Connect server at ${MIRTH_CONFIG.useHttps ? 'HTTPS' : 'HTTP'}://${MIRTH_CONFIG.hostname}:${MIRTH_CONFIG.port}. ${error.message}`
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

function parseXmlWithFastParser(xmlString) {
	try {
		const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
		return parser.parse(xmlString);
	} catch (error) {
		console.warn('⚠️ Failed to parse XML with fast-xml-parser:', error);
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
		let endpoint = `/api/channels/${channelId}/messages?limit=${limit}&offset=${offset}&searchDate=RECEIVED`;

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
			// XML response - parse with fast-xml-parser
			if (response.includes('<error>') || response.includes('Request failed')) {
				throw new Error('Mirth API returned an error response');
			}

			// DEBUG: show a few receivedDate/time nodes as present in raw XML
			try {
				const blocks = response.match(/<message[\s\S]*?<\/message>/g) || [];
				const samples = blocks.slice(0, 5).map((block, i) => {
					const receivedNode =
						(block.match(/<receivedDate>[\s\S]*?<\/receivedDate>/) || [])[0] || null;
					const anyTime = (block.match(/<time>([^<]+)<\/time>/) || [])[1] || null;
					return { idx: i, receivedDateNode: receivedNode, timeValue: anyTime };
				});
				// if (samples.length > 0) console.log('🔎 XML date/timestamp samples:', samples);
			} catch {}

			const xmlObj = parseXmlWithFastParser(response);
			if (!xmlObj) {
				throw new Error('Failed to parse XML response from Mirth API');
			}

			// Per server format: always { list: { message: [...] }}
			if (!xmlObj?.list?.message) {
				return [];
			}
			const list = Array.isArray(xmlObj.list.message) ? xmlObj.list.message : [xmlObj.list.message];

			messages = list.map((m, index) => {
				const toBool = (v) => (typeof v === 'string' ? v === 'true' : Boolean(v));
				const toInt = (v, d = 0) => {
					if (v === undefined || v === null || v === '') return d;
					const n = typeof v === 'number' ? v : parseInt(String(v), 10);
					return Number.isFinite(n) ? n : d;
				};

				// ID and server
				const id = m.id || m.messageId || m._id || `msg-${index}`;
				const serverId = m.serverId || null;

				// Dates: prefer epoch millis under receivedDate.time
				// Use RECEIVED date only (matches <receivedDate><time>...</time>)
				let epoch =
					m?.receivedDate?.time ??
					m?.receivedDate?.Time ??
					m?.connectorMessages?.entry?.value?.receivedDate?.time ??
					null;
				if (typeof epoch === 'string' && /^\d+$/.test(epoch)) epoch = parseInt(epoch, 10);
				let receivedDate;
				const normalizeEpoch = (v) => {
					if (v === null || v === undefined || v === '') return null;
					let n = typeof v === 'number' ? v : parseInt(String(v), 10);
					if (!Number.isFinite(n)) return null;
					// Heuristics: 10 digits=seconds, 13=ms, 16=micros
					const len = String(Math.floor(Math.abs(n))).length;
					if (len <= 10) return n * 1000;
					if (len >= 16) return Math.floor(n / 1000);
					return n; // assume ms
				};
				const epochMs = normalizeEpoch(epoch);
				if (epochMs !== null) {
					receivedDate = new Date(epochMs).toISOString();
				} else {
					receivedDate = '';
				}

				// Status/processed
				const status = m.status || 'UNKNOWN';
				const processed = toBool(m.processed);

				// Connector details (best-effort across shapes)
				let connectorName = m.connectorName || 'Unknown';
				let connectorType = m.connectorType || 'Unknown';
				let errorCode = m.errorCode || null;
				let sendAttempts = toInt(m.sendAttempts, 0);
				let chainId = toInt(m.chainId, 0);
				let orderId = toInt(m.orderId, 0);

				const entries = m?.connectorMessages?.entry
					? Array.isArray(m.connectorMessages.entry)
						? m.connectorMessages.entry
						: [m.connectorMessages.entry]
					: [];
				if (entries.length > 0) {
					const first = entries[0];
					// In many Mirth exports, the object value lives alongside a 'string' key
					const valueKey = Object.keys(first).find((k) => k !== 'string');
					const cm = valueKey ? first[valueKey] : null;
					if (cm) {
						connectorName = cm.connectorName || connectorName;
						connectorType = cm.connectorType || connectorType;
						errorCode = cm.errorCode || errorCode;
						sendAttempts = toInt(cm.sendAttempts, sendAttempts);
						chainId = toInt(cm.chainId, chainId);
						orderId = toInt(cm.orderId, orderId);
					}
				}

				// Content maps
				const rawContent = m?.sourceMapContent?.content ?? null;
				const transformedContent = m?.connectorMapContent?.content ?? null;
				const encodedContent = m?.channelMapContent?.content ?? null;
				const responseContent = m?.responseMapContent?.content ?? null;
				const processingErrorContent = m?.processingErrorContent?.content ?? null;
				const postProcessorErrorContent = m?.postProcessorErrorContent?.content ?? null;
				const responseErrorContent = m?.responseErrorContent?.content ?? null;
				const metaDataMap = m?.metaDataMap ?? null;

				return {
					id,
					channelId,
					channelName: m.channelName || 'Unknown Channel',
					receivedDate,
					receivedDateMs: epochMs ?? null,
					processed,
					status,
					serverId,
					connectorName,
					connectorType,
					errorCode,
					sendAttempts,
					chainId,
					orderId,
					content: rawContent,
					raw: rawContent,
					transformed: transformedContent,
					encoded: encodedContent,
					response: responseContent,
					responseTransformed: null,
					responseEncoded: null,
					processingErrorContent,
					postProcessorErrorContent,
					responseErrorContent,
					metaDataMap,
					error: processingErrorContent || responseErrorContent,
					correlationId: null,
					sequenceId: null
				};
			});
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
