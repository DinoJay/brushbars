import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import * as d3 from 'd3';

const PORT = 3001;
const LOG_DIR = 'C:/Program Files/Mirth Connect/logs/';
const LOG_FILE = path.join(LOG_DIR, 'mirth.log');

// Output file for all logs

// Performance settings
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max per file
const MAX_TOTAL_SIZE = 1 * 1024 * 1024 * 1024; // 1GB max total

const wss = new WebSocketServer({ port: PORT }, () => {
	console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
});

let lastSize = 0;

// Log parsing function
function parseLogLines(logText) {
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
				// Skip lines that don't match any pattern instead of creating invalid entries
				filteredCount++;
				if (filteredCount <= 5) {
					console.warn('⚠️ Skipping malformed log line:', line.substring(0, 100));
				}
			}
		}
	}

	// Filter out any entries with empty timestamps (shouldn't happen now, but just in case)
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

// Get all log files from the directory
function getLogFiles() {
	try {
		console.log('🔍 Scanning log directory:', LOG_DIR);

		const allFiles = fs.readdirSync(LOG_DIR);
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

// Helper function to get logs from the last N days
function getLogsFromLastDays(logs, days = 7) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	return logs.filter((log) => {
		const logDate = new Date(log.timestamp);
		return logDate >= cutoffDate;
	});
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

			// Send current day logs (including morning from rotated files)
			const logsToSend = currentDayLogs;

			console.log(
				`📊 Sending ${logsToSend.length} logs (current day including morning from rotated files)`
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

	// Send current day historical logs
	sendHistoricalLogs(ws);
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
