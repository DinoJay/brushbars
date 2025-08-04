import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';

const PORT = 3001;
const LOG_DIR = 'C:/Program Files/Mirth Connect/logs/';
const LOG_FILE = path.join(LOG_DIR, 'mirth.log');

// Output file for all logs
const OUTPUT_FILE = path.join(process.cwd(), 'all-logs.txt');

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

// Send all historical log data
async function sendHistoricalLogs(ws) {
	try {
		// First try to load from the output file if it exists
		if (fs.existsSync(OUTPUT_FILE)) {
			console.log('📖 Loading logs from existing file:', OUTPUT_FILE);
			const fileStats = fs.statSync(OUTPUT_FILE);
			console.log(`📄 File size: ${Math.round(fileStats.size / 1024)}KB`);

			const allLogs = fs.readFileSync(OUTPUT_FILE, 'utf8');
			console.log('allLogs', allLogs.length);

			ws.send(
				JSON.stringify({
					type: 'log-full',
					logs: allLogs.slice(0, 100000),
					stats: {
						fileSize: fileStats.size,
						lastModified: fileStats.mtime
					}
				})
			);
			console.log('✅ Sent existing logs from file');
			return;
		}

		// If no output file exists, read from log directory
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

		console.log(`📖 Starting to read ${logFiles.length} log files...`);

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
			console.log(
				`📊 Sending ${filesRead} log files (${Math.round(totalSize / 1024)}KB total) to client`
			);

			// Write logs to file for future use
			try {
				fs.writeFileSync(OUTPUT_FILE, allLogs, 'utf8');
				console.log(`💾 Logs written to: ${OUTPUT_FILE}`);
			} catch (err) {
				console.error('❌ Error writing logs to file:', err);
			}

			// Send to client
			ws.send(
				JSON.stringify({
					type: 'log-full',
					logs: allLogs,
					stats: {
						filesRead: filesRead,
						totalSize: totalSize
					}
				})
			);
		} else {
			ws.send(
				JSON.stringify({
					type: 'error',
					message: 'No log data found.'
				})
			);
		}
	} catch (err) {
		console.error('❌ Error sending historical logs:', err);
		ws.send(JSON.stringify({ type: 'error', message: 'Failed to read log files.' }));
	}
}

// Send new log lines as they appear
// function sendNewLines() {
// 	fs.stat(LOG_FILE, (err, stats) => {
// 		if (err) return;

// 		if (stats.size < lastSize) {
// 			// Log was rotated or truncated
// 			lastSize = 0;
// 		}

// 		if (stats.size > lastSize) {
// 			const stream = fs.createReadStream(LOG_FILE, {
// 				start: lastSize,
// 				end: stats.size
// 			});

// 			let newData = '';
// 			stream.on('data', (chunk) => (newData += chunk));
// 			stream.on('end', () => {
// 				lastSize = stats.size;
// 				if (newData.trim()) {
// 					// Append new logs to the output file
// 					try {
// 						fs.appendFileSync(OUTPUT_FILE, newData, 'utf8');
// 						console.log(` Appended ${newData.length} bytes to log file`);
// 					} catch (err) {
// 						console.error('❌ Error appending to log file:', err);
// 					}

// 					const message = JSON.stringify({ type: 'log-update', logs: newData });
// 					for (const client of wss.clients) {
// 						if (client.readyState === 1) {
// 							client.send(message);
// 						}
// 					}
// 				}
// 			});
// 		}
// 	});
// }

// Handle WebSocket connections
wss.on('connection', (ws) => {
	console.log('🔌 Client connected');
	ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to Mirth log stream' }));

	// Send all historical logs
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

// Watch for new log entries
// chokidar
// 	.watch(LOG_FILE, {
// 		usePolling: true,
// 		interval: 2000,
// 		awaitWriteFinish: {
// 			stabilityThreshold: 100,
// 			pollInterval: 100
// 		}
// 	})
// 	.on('change', sendNewLines);

console.log('🚀 WebSocket server ready');
console.log(` Logs will be saved to: ${OUTPUT_FILE}`);
