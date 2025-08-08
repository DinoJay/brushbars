import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

// File path for storing all messages data
const ALL_MESSAGES_FILE = path.join(
	process.cwd(),
	'src',
	'routes',
	'mirth-logs',
	'api',
	'messages',
	'all-messages-data.json'
);

// Helper function to safely get date string
function safeGetDateString(timestamp) {
	try {
		const date = new Date(timestamp);
		return date.toISOString().split('T')[0];
	} catch {
		return null;
	}
}

export async function GET({ params }) {
	const startTime = Date.now();
	const { date } = params;

	if (!date) {
		return json({ success: false, error: 'Date parameter is required' }, { status: 400 });
	}

	// Check if the all-messages-data.json file exists
	if (!fs.existsSync(ALL_MESSAGES_FILE)) {
		return json(
			{
				success: false,
				error:
					'No messages data file found. Please load the messages days API first to generate the data file.',
				filePath: ALL_MESSAGES_FILE
			},
			{ status: 404 }
		);
	}

	try {
		// Read all messages from file
		const fileContent = fs.readFileSync(ALL_MESSAGES_FILE, 'utf8');
		const messagesData = JSON.parse(fileContent);

		// Filter messages for the specific date
		const dayMessages = messagesData.messages.filter((message) => {
			const messageDate = safeGetDateString(message.timestamp);
			return messageDate === date;
		});

		const endTime = Date.now();
		console.log(
			`📦 Served ${dayMessages.length} messages for ${date} from file in ${endTime - startTime}ms`
		);

		return json({
			success: true,
			date,
			messages: dayMessages,
			totalMessages: dayMessages.length,
			dataSource: 'file',
			performance: { duration: endTime - startTime, dataSource: 'file' }
		});
	} catch (error) {
		console.error('❌ Error reading messages from file:', error);
		return json(
			{
				success: false,
				error: 'Failed to read messages from file',
				details: error.message
			},
			{ status: 500 }
		);
	}
}
