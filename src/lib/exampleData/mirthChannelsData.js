// Comprehensive Mirth Connect Channels and Messages Example Data
// Realistic healthcare integration data with multiple channels and daily message statistics

export const EXAMPLE_MAX_PER_DAY = 1000;

export const exampleChannels = [
	{
		id: 'a5a398c3-6fd8-4866-bc93-2924e3ac5f0d',
		name: 'ADT_QRY19',
		description: 'ADT Query A19 - Patient Demographics Query',
		enabled: true,
		lastModified: '2024-12-15T10:30:00.000Z',
		version: '4.5.2',
		revision: 40,
		deployed: true,
		connectorCount: 3,
		sourceConnectorCount: 1,
		destinationConnectorCount: 2
	},
	{
		id: 'b7c2f8d1-9e4a-4f5b-8c3d-1a2b3c4d5e6f',
		name: 'ORU_R01',
		description: 'ORU R01 - Observation Result Unsolicited',
		enabled: true,
		lastModified: '2024-12-14T14:22:00.000Z',
		version: '4.5.2',
		revision: 28,
		deployed: true,
		connectorCount: 4,
		sourceConnectorCount: 1,
		destinationConnectorCount: 3
	},
	{
		id: 'c9d3e7f2-1a5b-6c7d-9e8f-2a3b4c5d6e7f',
		name: 'SIU_S12',
		description: 'SIU S12 - Scheduling Information Unsolicited',
		enabled: true,
		lastModified: '2024-12-13T09:15:00.000Z',
		version: '4.5.2',
		revision: 15,
		deployed: true,
		connectorCount: 2,
		sourceConnectorCount: 1,
		destinationConnectorCount: 1
	},
	{
		id: 'd1e4f8a3-2b6c-7d8e-9f0a-3b4c5d6e7f8a',
		name: 'ADT_A01',
		description: 'ADT A01 - Patient Admission',
		enabled: true,
		lastModified: '2024-12-12T16:45:00.000Z',
		version: '4.5.2',
		revision: 52,
		deployed: true,
		connectorCount: 5,
		sourceConnectorCount: 1,
		destinationConnectorCount: 4
	},
	{
		id: 'e2f5a9b4-3c7d-8e9f-0a1b-4c5d6e7f8a9b',
		name: 'ADT_A03',
		description: 'ADT A03 - Patient Discharge',
		enabled: true,
		lastModified: '2024-12-11T11:20:00.000Z',
		version: '4.5.2',
		revision: 33,
		deployed: true,
		connectorCount: 3,
		sourceConnectorCount: 1,
		destinationConnectorCount: 2
	},
	{
		id: 'f3a6b0c5-4d8e-9f0a-1b2c-5d6e7f8a9b0c',
		name: 'ORU_R03',
		description: 'ORU R03 - Observation Result Query Response',
		enabled: false,
		lastModified: '2024-12-10T13:30:00.000Z',
		version: '4.5.2',
		revision: 8,
		deployed: false,
		connectorCount: 2,
		sourceConnectorCount: 1,
		destinationConnectorCount: 1
	},
	{
		id: 'a4b7c1d6-5e9f-0a1b-2c3d-6e7f8a9b0c1d',
		name: 'SIU_S13',
		description: 'SIU S13 - Notification of New Appointment Booking',
		enabled: true,
		lastModified: '2024-12-09T08:45:00.000Z',
		version: '4.5.2',
		revision: 19,
		deployed: true,
		connectorCount: 3,
		sourceConnectorCount: 1,
		destinationConnectorCount: 2
	},
	{
		id: 'b5c8d2e7-6f0a-1b2c-3d4e-7f8a9b0c1d2e',
		name: 'ADT_A04',
		description: 'ADT A04 - Patient Registration',
		enabled: true,
		lastModified: '2024-12-08T15:10:00.000Z',
		version: '4.5.2',
		revision: 45,
		deployed: true,
		connectorCount: 4,
		sourceConnectorCount: 1,
		destinationConnectorCount: 3
	}
];

// Generate realistic message data for each channel over the last 30 days
/**
 * @param {string} channelId
 * @param {number} [days=30]
 */
export function generateChannelMessages(channelId, days = 30) {
	/** @type {any[]} */
	const messages = [];
	const now = new Date();
	const channel = exampleChannels.find((c) => c.id === channelId);

	if (!channel) return messages;

	// Different message patterns based on channel type
	/** @type {Record<string, { successRate: number; avgPerDay: number; errorTypes: string[]; contentTypes: string[] }>} */
	const patterns = {
		ADT_QRY19: {
			successRate: 0.95,
			avgPerDay: 1500,
			errorTypes: ['SQL_TIMEOUT', 'INVALID_PATIENT_ID', 'DATABASE_CONNECTION_ERROR'],
			contentTypes: ['QRY^A19', 'ADR^A19']
		},
		ORU_R01: {
			successRate: 0.98,
			avgPerDay: 2500,
			errorTypes: ['INVALID_RESULT', 'MISSING_REQUIRED FIELD', 'ENCODING_ERROR'],
			contentTypes: ['ORU^R01', 'OBR', 'OBX']
		},
		SIU_S12: {
			successRate: 0.92,
			avgPerDay: 800,
			errorTypes: ['SCHEDULE_CONFLICT', 'INVALID_TIME_SLOT', 'PATIENT_NOT_FOUND'],
			contentTypes: ['SIU^S12', 'SCH', 'PID']
		},
		ADT_A01: {
			successRate: 0.97,
			avgPerDay: 1200,
			errorTypes: ['DUPLICATE_ADMISSION', 'INVALID_WARD', 'MISSING_INSURANCE'],
			contentTypes: ['ADT^A01', 'PID', 'PV1']
		},
		ADT_A03: {
			successRate: 0.96,
			avgPerDay: 1100,
			errorTypes: ['DISCHARGE_NOT_FOUND', 'INVALID_DISCHARGE_DATE', 'MISSING_DISCHARGE_SUMMARY'],
			contentTypes: ['ADT^A03', 'PID', 'PV1']
		},
		ORU_R03: {
			successRate: 0.94,
			avgPerDay: 600,
			errorTypes: ['QUERY_TIMEOUT', 'NO_RESULTS_FOUND', 'INVALID_QUERY_PARAMETERS'],
			contentTypes: ['ORU^R03', 'QRD', 'OBR']
		},
		SIU_S13: {
			successRate: 0.93,
			avgPerDay: 400,
			errorTypes: ['APPOINTMENT_CONFLICT', 'INVALID_DURATION', 'UNAVAILABLE_RESOURCE'],
			contentTypes: ['SIU^S13', 'SCH', 'PID']
		},
		ADT_A04: {
			successRate: 0.95,
			avgPerDay: 900,
			errorTypes: ['DUPLICATE_REGISTRATION', 'INVALID DEMOGRAPHICS', 'MISSING_REQUIRED_FIELDS'],
			contentTypes: ['ADT^A04', 'PID', 'PV1']
		}
	};

	const pattern = patterns[channel.name] || patterns['ADT_QRY19'];
	let messageId = 1;

	const MAX_PER_DAY = EXAMPLE_MAX_PER_DAY;

	for (let day = 0; day < days; day++) {
		const date = new Date(now);
		date.setDate(date.getDate() - day);

		// Generate messages for this day with realistic distribution
		const baseCount = pattern.avgPerDay;
		const variance = baseCount * 0.3; // 30% variance
		const dayCount = Math.floor(baseCount + (Math.random() - 0.5) * variance);

		// Weekend effect (fewer messages on weekends)
		const dayOfWeek = date.getDay();
		const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0;
		const finalDayCount = Math.floor(dayCount * weekendFactor);
		const cappedDayCount = Math.min(finalDayCount, MAX_PER_DAY);

		for (let i = 0; i < cappedDayCount; i++) {
			const success = Math.random() < pattern.successRate;
			const timestamp = new Date(date);

			// Create more realistic time distribution
			// Business hours: 6 AM to 8 PM with peak activity during 9 AM - 5 PM
			const hour = (() => {
				const rand = Math.random();
				if (rand < 0.6) {
					// 60% of messages during peak hours (9 AM - 5 PM)
					return 9 + Math.floor(Math.random() * 8);
				} else if (rand < 0.8) {
					// 20% of messages during early/late business hours (6-9 AM, 5-8 PM)
					return rand < 0.5
						? 6 + Math.floor(Math.random() * 3)
						: 17 + Math.floor(Math.random() * 3);
				} else {
					// 20% of messages during off-hours (8 PM - 6 AM)
					return rand < 0.5 ? 20 + Math.floor(Math.random() * 4) : Math.floor(Math.random() * 6);
				}
			})();

			// Vary minutes and seconds more realistically
			const minute = Math.floor(Math.random() * 60);
			const second = Math.floor(Math.random() * 60);
			const millisecond = Math.floor(Math.random() * 1000);

			timestamp.setHours(hour, minute, second, millisecond);

			const message = {
				id: `${channelId}_${messageId++}`,
				channelId: channelId,
				channelName: channel.name,
				receivedDate: timestamp.toISOString(),
				processed: success,
				status: success ? 'SENT' : 'ERROR',

				// Basic Message Information
				serverId: `96f0532e-8b4d-4086-ae72-622f90f7381d`,

				// Connector Information
				connectorName: success ? 'Destination 1' : 'Source Connector',
				connectorType: success ? 'DATABASE_WRITER' : 'HTTP_LISTENER',
				errorCode: success ? null : Math.floor(Math.random() * 10) + 1,
				sendAttempts: success ? 1 : Math.floor(Math.random() * 3) + 1,
				chainId: Math.floor(Math.random() * 5),
				orderId: Math.floor(Math.random() * 1000),

				// Message Content
				content: success
					? `${pattern.contentTypes[0]}|${Math.random().toString(36).substr(2, 8)}`
					: null,
				raw: success
					? `MSH|^~\\&|HIS|HOSPITAL|MIRTH|MIRTH|${timestamp.toISOString()}|${pattern.contentTypes[0]}`
					: null,
				transformed: success
					? `{"messageType": "${pattern.contentTypes[0]}", "timestamp": "${timestamp.toISOString()}"}`
					: null,
				encoded: success ? `encoded_${Math.random().toString(36).substr(2, 6)}` : null,
				response: success ? 'ACK' : 'NACK',
				responseTransformed: success ? '{"acknowledgment": "AA"}' : '{"acknowledgment": "AE"}',
				responseEncoded: success ? 'encoded_response' : 'encoded_error',

				// Processing Details
				processingErrorContent: success
					? null
					: `Error processing message: ${pattern.errorTypes[Math.floor(Math.random() * pattern.errorTypes.length)]}`,
				postProcessorErrorContent: success
					? null
					: Math.random() < 0.3
						? `Post-processor failed: ${pattern.errorTypes[Math.floor(Math.random() * pattern.errorTypes.length)]}`
						: null,
				responseErrorContent: success
					? null
					: Math.random() < 0.2
						? `Response error: ${pattern.errorTypes[Math.floor(Math.random() * pattern.errorTypes.length)]}`
						: null,
				metaDataMap: success
					? `{"source": "HIS", "priority": "normal", "batchId": "B${Math.random()
							.toString(36)
							.substr(2, 6)
							.toUpperCase()}"}`
					: null,

				// Additional fields
				correlationId: `CORR_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
				sequenceId: i + 1,
				error: success
					? null
					: pattern.errorTypes[Math.floor(Math.random() * pattern.errorTypes.length)]
			};

			messages.push(message);
		}
	}

	return messages.sort(
		(a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
	);
}

// Generate daily statistics for each channel
/**
 * @param {string} channelId
 * @param {number} [days=30]
 */
export function generateChannelStats(channelId, days = 30) {
	const messages = generateChannelMessages(channelId, days);
	/** @type {any[]} */
	const stats = [];
	const now = new Date();

	for (let day = 0; day < days; day++) {
		const date = new Date(now);
		date.setDate(date.getDate() - day);
		const dateStr = date.toISOString().split('T')[0];

		const dayMessages = messages
			.filter((m) => m.receivedDate.startsWith(dateStr))
			.slice(0, EXAMPLE_MAX_PER_DAY);

		const total = dayMessages.length;
		const processed = dayMessages.filter((m) => m.processed).length;
		const failed = total - processed;
		const pending = Math.floor(Math.random() * 10);
		const queued = Math.floor(Math.random() * 5);

		stats.push({
			date: dateStr,
			total,
			processed,
			failed,
			pending,
			queued,
			successRate: total > 0 ? ((processed / total) * 100).toFixed(2) : '0'
		});
	}

	return stats.sort((a, b) => b.date.localeCompare(a.date));
}

// Generate comprehensive data for all channels
export function generateAllChannelData() {
	const allData = {
		channels: exampleChannels,
		/** @type {Record<string, any[]>} */ channelMessages: {},
		/** @type {Record<string, any[]>} */ channelStats: {},
		summary: {
			totalChannels: exampleChannels.length,
			enabledChannels: exampleChannels.filter((c) => c.enabled).length,
			totalMessages: 0,
			totalProcessed: 0,
			totalFailed: 0,
			/** @type {number} */ averageSuccessRate: 0
		}
	};

	let totalMessages = 0;
	let totalProcessed = 0;
	let totalFailed = 0;

	exampleChannels.forEach((channel) => {
		const messages = generateChannelMessages(channel.id, 30);
		const stats = generateChannelStats(channel.id, 30);

		allData.channelMessages[channel.id] = messages;
		allData.channelStats[channel.id] = stats;

		totalMessages += messages.length;
		totalProcessed += messages.filter((m) => m.processed).length;
		totalFailed += messages.filter((m) => !m.processed).length;
	});

	allData.summary.totalMessages = totalMessages;
	allData.summary.totalProcessed = totalProcessed;
	allData.summary.totalFailed = totalFailed;
	allData.summary.averageSuccessRate =
		totalMessages > 0 ? (totalProcessed / totalMessages) * 100 : 0;

	return allData;
}

// Export individual functions for specific use cases
export const getChannelMessages = generateChannelMessages;
export const getChannelStats = generateChannelStats;
export const getAllChannelData = generateAllChannelData;
