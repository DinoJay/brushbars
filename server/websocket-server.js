import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
// Import parseLogLines from apiHelpers (includes all necessary parsing functions)
import { parseLogLines } from '../src/lib/apiHelpers.js';

const PORT = 3001;

// Default to production Mirth logs directory
let LOG_DIR = 'C:/Program Files/Mirth Connect/logs/';

// When running "at home", use the checked-in example data
const IS_ATHOME = process.env.ATHOME === 'true' || process.env.athome === 'true';
if (IS_ATHOME) {
	LOG_DIR = path.join(process.cwd(), 'server', 'exampleData');
	console.log('🏠 ATHOME mode: using exampleData at', LOG_DIR);
}

const LOG_FILE = path.join(LOG_DIR, 'mirth.log');

// Message API polling configuration
const MESSAGES_API_BASE_URL = process.env.MESSAGES_API_URL || 'http://localhost:5173';
const MESSAGES_POLL_INTERVAL = 2000; // 2 seconds
let messagesPollingInterval = null;
let lastMessagesData = null;

// Output file for all logs

// Performance settings
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max per file
const MAX_TOTAL_SIZE = 1 * 1024 * 1024 * 1024; // 1GB max total

const wss = new WebSocketServer({ port: PORT }, () => {
	console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
});

let lastSize = 0;

// Get all log files from the directory
function getLogFiles() {
	try {
		console.log('🔍 Scanning log directory:', LOG_DIR);

		const allFiles = fs.readdirSync(LOG_DIR);
		console.log('allFiles', allFiles);
		console.log(' Files found:', allFiles);

		// Filter for log files only
		const logFiles = allFiles
			.filter((file) => {
				// Skip directories and hidden files
				if (file.startsWith('.') || fs.statSync(path.join(LOG_DIR, file)).isDirectory()) {
					return false;
				}

				// Only include files ending with .log or .log.x
				return file.endsWith('.log') || file.match(/\.log\.\d+$/);
			})
			.map((file) => ({
				name: file,
				path: path.join(LOG_DIR, file),
				stats: fs.statSync(path.join(LOG_DIR, file))
			}))
			.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

		console.log(
			'📄 Log files to process:',
			logFiles.map((f) => f.name)
		);
		return logFiles;
	} catch (err) {
		console.error('❌ Error reading log directory:', err);
		return [];
	}
}

// Read a single log file with size limits
function readLogFile(filePath) {
	return new Promise((resolve, reject) => {
		fs.stat(filePath, (err, stats) => {
			if (err) {
				reject(err);
				return;
			}

			const fileName = path.basename(filePath);

			// If file is too large, read only the end
			if (stats.size > MAX_FILE_SIZE) {
				console.warn(
					`⚠️ Large file detected: ${fileName} (${Math.round(stats.size / 1024 / 1024)}MB), reading last ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
				);

				const stream = fs.createReadStream(filePath, {
					start: Math.max(0, stats.size - MAX_FILE_SIZE),
					end: stats.size
				});

				let data = '';
				stream.on('data', (chunk) => {
					data += chunk;
				});
				stream.on('end', () => {
					resolve(data);
				});
				stream.on('error', reject);
			} else {
				// Read entire file
				fs.readFile(filePath, 'utf8', (err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				});
			}
		});
	});
}

// Helper function to get current day logs
function getCurrentDayLogs(logs) {
	const today = new Date();
	const todayString = today.toISOString().split('T')[0];

	return logs.filter((log) => {
		const logDate = new Date(log.timestamp).toISOString().split('T')[0];
		return logDate === todayString;
	});
}

// Fetch messages from the messages API
async function fetchMessagesFromAPI() {
	try {
		const today = new Date().toISOString().split('T')[0];
		const response = await fetch(`${MESSAGES_API_BASE_URL}/mirth-logs/api/messages/${today}`);
		if (response.ok) {
			const data = await response.json();
			return data;
		}
	} catch (error) {
		console.error('Error fetching messages from API:', error);
	}
	return null;
}

// Broadcast messages to all connected clients
function broadcastMessages(data) {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(
				JSON.stringify({
					type: 'messages-update',
					data: data
				})
			);
		}
	});
}

// Start polling for messages
function startMessagesPolling() {
	// Only poll messages API when not in ATHOME mode
	if (IS_ATHOME) {
		console.log('🏠 ATHOME mode: skipping message API polling (using synthetic data)');
		return;
	}

	if (messagesPollingInterval) return;

	messagesPollingInterval = setInterval(async () => {
		try {
			const data = await fetchMessagesFromAPI();
			if (data && data.success && data.messages) {
				// Check if we have new data
				const currentData = JSON.stringify(data.messages);
				if (currentData !== lastMessagesData) {
					lastMessagesData = currentData;
					broadcastMessages(data.messages);
					console.log(
						`📡 Broadcasted ${data.messages.length} messages to ${wss.clients.size} clients`
					);
				}
			}
		} catch (error) {
			console.error('❌ Error in message polling:', error);
			// Broadcast error to clients
			wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(
						JSON.stringify({
							type: 'messages-error',
							error: 'Failed to fetch messages from API'
						})
					);
				}
			});
		}
	}, MESSAGES_POLL_INTERVAL);

	console.log('🚀 Started messages polling');
}

// Send example messages for ATHOME mode
function sendExampleMessages() {
	if (!IS_ATHOME) return;

	// Generate realistic example messages
	const exampleMessages = [
		{
			id: 'msg-001',
			timestamp: new Date().toISOString(),
			level: 'INFO',
			channel: 'ADT_A01',
			message: 'Patient admission message processed successfully',
			status: 'PROCESSED',
			messageId: 'MSG-ADT001',
			processingTime: 150,
			queueSize: 5,
			protocol: 'HL7',
			sourcePort: 8080,
			destinationPort: 9090
		},
		{
			id: 'msg-002',
			timestamp: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
			level: 'WARN',
			channel: 'ORU_R01',
			message: 'Lab results message queued due to high volume',
			status: 'QUEUED',
			messageId: 'MSG-ORU001',
			processingTime: 0,
			queueSize: 25,
			protocol: 'HL7',
			sourcePort: 8081,
			destinationPort: 9091
		},
		{
			id: 'msg-003',
			timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
			level: 'ERROR',
			channel: 'SIU_S12',
			message: 'Failed to process scheduling message - invalid format',
			status: 'FAILED',
			messageId: 'MSG-SIU001',
			processingTime: 50,
			queueSize: 12,
			protocol: 'HL7',
			sourcePort: 8082,
			destinationPort: 9092
		},
		{
			id: 'msg-004',
			timestamp: new Date(Date.now() - 90000).toISOString(), // 1.5 minutes ago
			level: 'INFO',
			channel: 'LAB_RESULTS',
			message: 'Laboratory results message sent to downstream system',
			status: 'SENT',
			messageId: 'MSG-LAB001',
			processingTime: 200,
			queueSize: 3,
			protocol: 'FHIR',
			sourcePort: 8083,
			destinationPort: 9093
		}
	];

	// Broadcast example messages to all connected clients
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(
				JSON.stringify({
					type: 'messages-update',
					data: exampleMessages
				})
			);
		}
	});

	console.log(
		`🏠 ATHOME mode: sent ${exampleMessages.length} example messages to ${wss.clients.size} clients`
	);
}

// Stop polling for messages
function stopMessagesPolling() {
	if (messagesPollingInterval) {
		clearInterval(messagesPollingInterval);
		messagesPollingInterval = null;
		console.log('🛑 Stopped messages polling');
	}
}

async function sendHistoricalLogs(ws) {
	try {
		// Always read from log directory to get all current day logs (including rotated files)
		const logFiles = getLogFiles();

		if (logFiles.length === 0) {
			ws.send(
				JSON.stringify({
					type: 'error',
					message: 'No log files found in directory.'
				})
			);
			return;
		}

		console.log(`📖 Starting to read ${logFiles.length} log files for current day logs...`);

		let allLogs = '';
		let filesRead = 0;
		let totalSize = 0;

		// Process files sequentially to avoid memory issues
		for (const file of logFiles) {
			// Check total size limit
			if (totalSize > MAX_TOTAL_SIZE) {
				console.warn('⚠️ Reached total size limit, stopping file reading');
				break;
			}

			try {
				const logData = await readLogFile(file.path);

				// Check if adding this file would exceed the limit
				if (totalSize + logData.length > MAX_TOTAL_SIZE) {
					console.warn('⚠️ Adding this file would exceed size limit, stopping');
					break;
				}

				allLogs += logData + '\n';
				totalSize += logData.length;
				filesRead++;

				console.log(`✅ Read: ${file.name} (${Math.round(logData.length / 1024)}KB)`);
			} catch (err) {
				console.error(`❌ Error reading ${file.name}:`, err);
			}
		}

		if (allLogs.trim()) {
			// Parse the logs
			const parsedLogs = parseLogLines(allLogs);
			console.log(`📊 Parsed ${parsedLogs.length} log entries from ${filesRead} files`);

			// Get current day logs for real-time context
			const currentDayLogs = getCurrentDayLogs(parsedLogs);
			console.log(`📊 Found ${currentDayLogs.length} logs for current day`);

			// Limit to 1200 logs per day (newest first)
			const limitedLogs = currentDayLogs
				.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
				.slice(0, 1200);

			// Send limited current day logs
			const logsToSend = limitedLogs;

			console.log(
				`📊 Sending ${logsToSend.length} logs (current day including morning from rotated files, limited from ${currentDayLogs.length})`
			);

			// Send current day logs to client
			ws.send(
				JSON.stringify({
					type: 'log-full',
					logs: logsToSend,
					stats: {
						filesRead: filesRead,
						totalSize: totalSize,
						parsedCount: parsedLogs.length,
						sentCount: logsToSend.length,
						currentDayCount: currentDayLogs.length,
						originalCount: currentDayLogs.length,
						limitApplied: true,
						dataType: 'current-day-complete'
					}
				})
			);
			console.log('✅ Sent complete current day logs (including morning from rotated files)');
		} else {
			ws.send(
				JSON.stringify({
					type: 'error',
					message: 'No valid log data found in files.'
				})
			);
		}
	} catch (err) {
		console.error('❌ Error sending historical logs:', err);
		ws.send(
			JSON.stringify({
				type: 'error',
				message: 'Failed to load historical logs.'
			})
		);
	}
}

// Send new log lines as they appear (current day only)
function sendNewLines() {
	// Check if output file exists and has new content
	if (!fs.existsSync(LOG_FILE)) return;

	fs.stat(LOG_FILE, (err, stats) => {
		if (err) return;

		if (stats.size < lastSize) {
			// Log was rotated or truncated
			lastSize = 0;
		}

		if (stats.size > lastSize) {
			const stream = fs.createReadStream(LOG_FILE, {
				start: lastSize,
				end: stats.size
			});

			let newData = '';
			stream.on('data', (chunk) => {
				// console.log('new data', chunk);
				newData += chunk;
			});
			stream.on('end', () => {
				lastSize = stats.size;
				if (newData.trim()) {
					// Parse the new log data
					const newLogs = parseLogLines(newData);

					// Filter for current day logs only
					const currentDayNewLogs = getCurrentDayLogs(newLogs);

					if (currentDayNewLogs.length > 0) {
						console.log(`📡 Sending ${currentDayNewLogs.length} new current day logs`);

						const message = JSON.stringify({
							type: 'log-update',
							logs: currentDayNewLogs,
							stats: {
								newLogsCount: currentDayNewLogs.length,
								totalNewLogs: newLogs.length,
								dataType: 'current-day-update'
							}
						});

						for (const client of wss.clients) {
							if (client.readyState === 1) {
								client.send(message);
							}
						}
					} else {
						console.log(
							`📡 New logs received but none are from current day (${newLogs.length} total)`
						);
					}
				}
			});
		}
	});
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
	console.log('🔌 Client connected');
	ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to Mirth log stream' }));

	// Start polling when first client connects (only if not in ATHOME mode)
	if (wss.clients.size === 1 && !IS_ATHOME) {
		startMessagesPolling();
	}

	// Send example messages immediately when in ATHOME mode
	if (IS_ATHOME) {
		sendExampleMessages();
	}

	// Send current day historical logs
	sendHistoricalLogs(ws);

	// Handle client disconnection
	ws.on('close', () => {
		console.log('🔌 Client disconnected');
		// Stop polling when last client disconnects (only if not in ATHOME mode)
		if (wss.clients.size === 0 && !IS_ATHOME) {
			stopMessagesPolling();
		}
	});
});

// Handle client messages
wss.on('message', (ws, message) => {
	try {
		const data = JSON.parse(message);
		if (data.type === 'request-historical') {
			console.log('📅 Client requested historical logs');
			sendHistoricalLogs(ws);
		}
	} catch (err) {
		console.error('❌ Error parsing client message:', err);
	}
});

// Watch for new log entries in the output file
chokidar
	.watch(LOG_FILE, {
		usePolling: true,
		interval: 2000,
		awaitWriteFinish: {
			stabilityThreshold: 100,
			pollInterval: 100
		}
	})
	.on('change', sendNewLines);

console.log('🚀 WebSocket server ready');
console.log(`📡 Real-time current day logs will be streamed from: ${LOG_FILE}`);

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n🛑 Shutting down WebSocket server...');
	stopMessagesPolling();
	wss.close(() => {
		console.log('✅ WebSocket server closed');
		process.exit(0);
	});
});

process.on('SIGTERM', () => {
	console.log('\n🛑 Shutting down WebSocket server...');
	stopMessagesPolling();
	wss.close(() => {
		console.log('✅ WebSocket server closed');
		process.exit(0);
	});
});

// In ATHOME mode, synthesize example dev logs periodically to exercise the UI without real files
if (IS_ATHOME) {
	console.log('🏠 ATHOME: enabling synthetic devLog stream');
	const LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
	function makeFakeLog(i) {
		const level = LEVELS[Math.floor(Math.random() * LEVELS.length)];
		const now = new Date();
		// Randomize within current minute for nicer distribution
		now.setMilliseconds(Math.floor(Math.random() * 1000));
		return {
			id: `sim-${now.getTime()}-${i}`,
			level,
			timestamp: now.toISOString(),
			channel: ['MAIN', 'PDF', 'HL7', 'LAB'][Math.floor(Math.random() * 4)],
			message:
				level === 'ERROR'
					? 'Simulated processing error occurred'
					: level === 'WARN'
						? 'Simulated warning event'
						: level === 'DEBUG'
							? 'Simulated debug details'
							: 'Simulated info message'
		};
	}

	// Channel Message generation
	const MESSAGE_TYPES = ['INFO', 'WARN', 'ERROR'];
	const CHANNELS = ['ADT_A01', 'ORU_R01', 'SIU_S12', 'LAB_RESULTS', 'PHARMACY_ORDERS'];

	function makeFakeChannelMessage(i) {
		const type = MESSAGE_TYPES[Math.floor(Math.random() * MESSAGE_TYPES.length)];
		const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
		const now = new Date();
		// Randomize within current minute for nicer distribution
		now.setMilliseconds(now.getMilliseconds() - Math.floor(Math.random() * 1000));

		return {
			id: `sim-msg-${now.getTime()}-${i}`,
			level: type, // Use message type as level for consistency
			timestamp: now.toISOString(),
			channel,
			message: `Simulated ${type.toLowerCase()} message for ${channel}`,
			status: type,
			messageId: `MSG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
			processingTime: Math.floor(Math.random() * 500) + 50, // 50-550ms
			queueSize: Math.floor(Math.random() * 100),
			protocol: ['HL7', 'FHIR', 'X12'][Math.floor(Math.random() * 3)],
			sourcePort: Math.floor(Math.random() * 65535) + 1024,
			destinationPort: Math.floor(Math.random() * 65535) + 1024
		};
	}

	// Broadcast helper for both types
	function broadcast(type, data, dataType = 'athome-synthetic') {
		const msg = JSON.stringify({
			type,
			...data,
			stats: { dataType, count: data.logs?.length || data.messages?.length || 0 }
		});
		for (const client of wss.clients) {
			if (client.readyState === 1) client.send(msg);
		}
	}

	// Periodically send small bursts of new logs (every 6 seconds)
	const LOG_INTERVAL_MS = Number(process.env.SYNTH_LOG_INTERVAL_MS || 1000);
	const LOG_BURST_MIN = 3;
	const LOG_BURST_MAX = 15;

	setInterval(() => {
		const n = Math.floor(Math.random() * (LOG_BURST_MIN - LOG_BURST_MAX + 1)) + LOG_BURST_MIN;
		const logs = Array.from({ length: n }, (_, i) => makeFakeLog(i));
		broadcast('log-update', { logs }, 'athome-synthetic-logs');
		console.log(`📡 Generated ${logs.length} synthetic dev logs`);
	}, LOG_INTERVAL_MS);

	// Periodically send small bursts of new channel messages (every 4 seconds)
	const MESSAGE_INTERVAL_MS = Number(process.env.SYNTH_MESSAGE_INTERVAL_MS || 1000);
	const MESSAGE_BURST_MIN = 2;
	const MESSAGE_BURST_MAX = 8;

	setInterval(() => {
		const n =
			Math.floor(Math.random() * (MESSAGE_BURST_MIN - MESSAGE_BURST_MAX + 1)) + MESSAGE_BURST_MIN;
		const messages = Array.from({ length: n }, (_, i) => makeFakeChannelMessage(i));
		broadcast('message-update', { messages }, 'athome-synthetic-messages');
		console.log(`📡 Generated ${messages.length} synthetic channel messages`);
	}, MESSAGE_INTERVAL_MS);

	// Periodically send example messages for ATHOME mode (every 5 seconds)
	setInterval(() => {
		if (IS_ATHOME && wss.clients.size > 0) {
			sendExampleMessages();
		}
	}, 1000000);
}
