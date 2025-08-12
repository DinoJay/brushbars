<script lang="ts">
	import type { TimelineEntry } from '$lib/types';

	const { log } = $props<{
		log: TimelineEntry;
	}>();

	// Track active tab for this specific log
	let activeTab = $state('overview');

	// Helper function to format values
	function formatValue(value: unknown): string {
		if (value === null || value === undefined) return '—';
		if (typeof value === 'number') {
			// Format numbers with appropriate precision
			if (value > 1000000) return `${(value / 1000000).toFixed(2)}M`;
			if (value > 1000) return `${(value / 1000).toFixed(2)}K`;
			return value.toString();
		}
		if (typeof value === 'string') {
			// Truncate long strings
			return value.length > 100 ? value.substring(0, 100) + '...' : value;
		}
		return String(value);
	}

	// Helper function to check if a value exists
	function hasValue(value: unknown): boolean {
		return value !== null && value !== undefined && value !== '';
	}
</script>

<div
	class="rounded-xl p-6"
	style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border); color: var(--color-text-primary);"
>
	<!-- Dev Log Details Tabs -->
	<div class="mb-6">
		<div class="border-b" style="border-color: var(--color-border);">
			<nav class="-mb-px flex space-x-8 overflow-x-auto">
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'overview'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'overview')}
				>
					Overview
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'extended'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'extended')}
				>
					Extended Details
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'channel'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'channel')}
				>
					Channel Info
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'processing'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'processing')}
				>
					Processing
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'performance'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'performance')}
				>
					Performance
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'network'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'network')}
				>
					Network
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'errors'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'errors')}
				>
					Errors
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'raw'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'raw')}
				>
					Raw Data
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'sql'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'sql')}
				>
					SQL & Data
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap"
					style={activeTab === 'hl7'
						? 'border-color: var(--color-accent); color: var(--color-accent-dark);'
						: 'border-color: transparent; color: var(--color-text-secondary);'}
					onclick={() => (activeTab = 'hl7')}
				>
					HL7 Messages
				</button>
			</nav>
		</div>
	</div>

	<!-- Tab Content with Fixed Height -->
	<div class="h-64 overflow-y-auto">
		{#if activeTab === 'overview'}
			<div class="space-y-4">
				<!-- Basic Information -->
				<div>
					<h4 class="mb-2 text-sm font-medium" style="color: var(--color-text-primary);">
						Basic Information
					</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span style="color: var(--color-text-secondary);">Log ID:</span>
							<span class="ml-2 font-mono" style="color: var(--color-text-primary);"
								>{formatValue(log.id)}</span
							>
						</div>
						<div>
							<span style="color: var(--color-text-secondary);">Timestamp:</span>
							<span class="ml-2 font-mono" style="color: var(--color-text-primary);"
								>{new Date(log.timestamp).toLocaleString()}</span
							>
						</div>
						<div>
							<span style="color: var(--color-text-secondary);">Level:</span>
							<span class="ml-2 font-medium" style="color: var(--color-text-primary);"
								>{formatValue(log.level)}</span
							>
						</div>
						<div>
							<span style="color: var(--color-text-secondary);">Channel:</span>
							<span class="ml-2 font-medium" style="color: var(--color-text-primary);"
								>{formatValue(log.channel)}</span
							>
						</div>
						<div>
							<span style="color: var(--color-text-secondary);">Status:</span>
							<span class="ml-2 font-medium" style="color: var(--color-text-primary);"
								>{formatValue(log.status)}</span
							>
						</div>
						<div>
							<span style="color: var(--color-text-secondary);">Message:</span>
							<span class="ml-2" style="color: var(--color-text-primary);"
								>{formatValue(log.message)}</span
							>
						</div>
					</div>
				</div>

				<!-- Quick Stats -->
				{#if hasValue(log.processingTime) || hasValue(log.responseTime) || hasValue(log.queueSize)}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Quick Stats</h4>
						<div class="grid grid-cols-3 gap-4 text-sm">
							{#if hasValue(log.processingTime)}
								<div>
									<span class="text-gray-500">Processing:</span>
									<span class="ml-2 font-medium text-gray-900"
										>{formatValue(log.processingTime)}</span
									>
								</div>
							{/if}
							{#if hasValue(log.responseTime)}
								<div>
									<span class="text-gray-500">Response:</span>
									<span class="ml-2 font-medium text-gray-900">{formatValue(log.responseTime)}</span
									>
								</div>
							{/if}
							{#if hasValue(log.queueSize)}
								<div>
									<span class="text-gray-500">Queue:</span>
									<span class="ml-2 font-medium text-gray-900">{formatValue(log.queueSize)}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'extended'}
			<div class="space-y-4">
				<!-- Extended Log Details -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Extended Log Details</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Thread ID:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.threadId)}</span>
						</div>
						<div>
							<span class="text-gray-500">User ID:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.userId)}</span>
						</div>
						<div>
							<span class="text-gray-500">Session ID:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.sessionId)}</span>
						</div>
						<div>
							<span class="text-gray-500">Correlation ID:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.correlationId)}</span>
						</div>
						<div>
							<span class="text-gray-500">Source IP:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.sourceIp)}</span>
						</div>
						<div>
							<span class="text-gray-500">Destination IP:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.destinationIp)}</span>
						</div>
					</div>
				</div>

				<!-- Additional Context -->
				{#if hasValue(log.messageId) || hasValue(log.connectorType)}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Additional Context</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if hasValue(log.messageId)}
								<div>
									<span class="text-gray-500">Message ID:</span>
									<span class="ml-2 font-mono text-gray-900">{formatValue(log.messageId)}</span>
								</div>
							{/if}
							{#if hasValue(log.connectorType)}
								<div>
									<span class="text-gray-500">Connector Type:</span>
									<span class="ml-2 font-medium text-gray-900"
										>{formatValue(log.connectorType)}</span
									>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'channel'}
			<div class="space-y-4">
				<!-- Channel-Specific Information -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Channel Information</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Channel Name:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.channelName)}</span>
						</div>
						<div>
							<span class="text-gray-500">Channel Version:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.channelVersion)}</span>
						</div>
						<div>
							<span class="text-gray-500">Connector Type:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.connectorType)}</span>
						</div>
						<div>
							<span class="text-gray-500">Connector Name:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.connectorName)}</span>
						</div>
						<div>
							<span class="text-gray-500">Channel ID:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.channelId)}</span>
						</div>
						<div>
							<span class="text-gray-500">Channel Status:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.channelStatus)}</span>
						</div>
					</div>
				</div>

				<!-- Channel Performance -->
				{#if hasValue(log.throughput) || hasValue(log.avgProcessingTime)}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Channel Performance</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if hasValue(log.throughput)}
								<div>
									<span class="text-gray-500">Throughput:</span>
									<span class="ml-2 font-medium text-gray-900">{formatValue(log.throughput)}</span>
								</div>
							{/if}
							{#if hasValue(log.avgProcessingTime)}
								<div>
									<span class="text-gray-500">Avg Processing:</span>
									<span class="ml-2 font-medium text-gray-900"
										>{formatValue(log.avgProcessingTime)}</span
									>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'processing'}
			<div class="space-y-4">
				<!-- Processing Context -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Processing Context</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Message ID:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.messageId)}</span>
						</div>
						<div>
							<span class="text-gray-500">Processing Time:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.processingTime)}</span>
						</div>
						<div>
							<span class="text-gray-500">Queue Size:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.queueSize)}</span>
						</div>
						<div>
							<span class="text-gray-500">Memory Usage:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.memoryUsage)}</span>
						</div>
						<div>
							<span class="text-gray-500">CPU Usage:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.cpuUsage)}</span>
						</div>
						<div>
							<span class="text-gray-500">Processing Status:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.processingStatus)}</span
							>
						</div>
					</div>
				</div>

				<!-- Processing Metrics -->
				{#if hasValue(log.queueLatency) || hasValue(log.peakMemoryUsage)}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Processing Metrics</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if hasValue(log.queueLatency)}
								<div>
									<span class="text-gray-500">Queue Latency:</span>
									<span class="ml-2 font-medium text-gray-900">{formatValue(log.queueLatency)}</span
									>
								</div>
							{/if}
							{#if hasValue(log.peakMemoryUsage)}
								<div>
									<span class="text-gray-500">Peak Memory:</span>
									<span class="ml-2 font-mono text-gray-900"
										>{formatValue(log.peakMemoryUsage)}</span
									>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'performance'}
			<div class="space-y-4">
				<!-- Performance Metrics -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Performance Metrics</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Response Time:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.responseTime)}</span>
						</div>
						<div>
							<span class="text-gray-500">Throughput:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.throughput)}</span>
						</div>
						<div>
							<span class="text-gray-500">Queue Latency:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.queueLatency)}</span>
						</div>
						<div>
							<span class="text-gray-500">Resource Utilization:</span>
							<span class="ml-2 font-medium text-gray-900"
								>{formatValue(log.resourceUtilization)}</span
							>
						</div>
						<div>
							<span class="text-gray-500">Average Processing Time:</span>
							<span class="ml-2 font-medium text-gray-900"
								>{formatValue(log.avgProcessingTime)}</span
							>
						</div>
						<div>
							<span class="text-gray-500">Peak Memory Usage:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.peakMemoryUsage)}</span>
						</div>
					</div>
				</div>

				<!-- Performance Trends -->
				{#if hasValue(log.cpuUsage) || hasValue(log.memoryUsage)}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">Resource Usage</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if hasValue(log.cpuUsage)}
								<div>
									<span class="text-gray-500">CPU Usage:</span>
									<span class="ml-2 font-medium text-gray-900">{formatValue(log.cpuUsage)}</span>
								</div>
							{/if}
							{#if hasValue(log.memoryUsage)}
								<div>
									<span class="text-gray-500">Memory Usage:</span>
									<span class="ml-2 font-mono text-gray-900">{formatValue(log.memoryUsage)}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'network'}
			<div class="space-y-4">
				<!-- Network Information -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Network Information</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Protocol:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.protocol)}</span>
						</div>
						<div>
							<span class="text-gray-500">Source Port:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.sourcePort)}</span>
						</div>
						<div>
							<span class="text-gray-500">Destination Port:</span>
							<span class="ml-2 font-mono text-gray-900">{formatValue(log.destinationPort)}</span>
						</div>
						<div>
							<span class="text-gray-500">Connection Status:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.connectionStatus)}</span
							>
						</div>
						<div>
							<span class="text-gray-500">Network Latency:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.networkLatency)}</span>
						</div>
						<div>
							<span class="text-gray-500">Connection Type:</span>
							<span class="ml-2 font-medium text-gray-900">{formatValue(log.connectionType)}</span>
						</div>
					</div>
				</div>

				<!-- IP Addresses -->
				{#if hasValue(log.sourceIp) || hasValue(log.destinationIp)}
					<div>
						<h4 class="mb-2 text-sm font-medium text-gray-900">IP Addresses</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if hasValue(log.sourceIp)}
								<div>
									<span class="text-gray-500">Source IP:</span>
									<span class="ml-2 font-mono text-gray-900">{formatValue(log.sourceIp)}</span>
								</div>
							{/if}
							{#if hasValue(log.destinationIp)}
								<div>
									<span class="text-gray-500">Destination IP:</span>
									<span class="ml-2 font-mono text-gray-900">{formatValue(log.destinationIp)}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'errors'}
			<div class="space-y-4">
				<!-- Error Context -->
				{#if log.level === 'ERROR'}
					<div>
						<h4 class="mb-2 text-sm font-medium text-red-900">Error Context</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-500">Exception Type:</span>
								<span class="ml-2 font-mono text-red-800">{formatValue(log.exceptionType)}</span>
							</div>
							<div>
								<span class="text-gray-500">Error Code:</span>
								<span class="ml-2 font-mono text-red-800">{formatValue(log.errorCode)}</span>
							</div>
							<div>
								<span class="text-gray-500">Retry Count:</span>
								<span class="ml-2 font-medium text-red-800">{formatValue(log.retryCount)}</span>
							</div>
							<div>
								<span class="text-gray-500">Last Error:</span>
								<span class="ml-2 text-red-800">{formatValue(log.lastError)}</span>
							</div>
						</div>
					</div>

					<!-- Stack Trace -->
					{#if log.stackTrace}
						<div>
							<h4 class="mb-2 text-sm font-medium text-red-900">Stack Trace</h4>
							<pre
								class="overflow-x-auto rounded border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-800">{log.stackTrace}</pre>
						</div>
					{/if}

					<!-- Error Details -->
					{#if log.errorDetails}
						<div>
							<h4 class="mb-2 text-sm font-medium text-red-900">Error Details</h4>
							<pre
								class="overflow-x-auto rounded border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-800">{log.errorDetails}</pre>
						</div>
					{/if}
				{:else}
					<div class="py-8 text-center">
						<div class="mb-2 text-4xl text-gray-300">✅</div>
						<div class="text-sm text-gray-500">No errors recorded for this log entry</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'raw'}
			<div class="space-y-4">
				<!-- Raw Data View -->
				<div>
					<h4 class="mb-2 text-sm font-medium text-gray-900">Raw Log Data</h4>
					<pre
						class="overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">{JSON.stringify(
							log,
							null,
							2
						)}</pre>
				</div>
			</div>
		{:else if activeTab === 'sql'}
			<div class="space-y-4">
				<!-- SQL Queries and Data -->
				{#if log.sqlQuery}
					<div>
						<h4 class="mb-2 text-sm font-medium text-blue-900">SQL Query</h4>
						<pre
							class="overflow-x-auto rounded border border-blue-200 bg-blue-50 p-3 font-mono text-xs text-blue-800">{log.sqlQuery}</pre>
					</div>
				{/if}

				{#if log.patientInfo}
					<div>
						<h4 class="mb-2 text-sm font-medium text-green-900">Patient Information</h4>
						<div class="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
							{log.patientInfo}
						</div>
					</div>
				{/if}

				{#if !log.sqlQuery && !log.patientInfo}
					<div class="py-8 text-center">
						<div class="mb-2 text-4xl text-gray-300">🗄️</div>
						<div class="text-sm text-gray-500">
							No SQL queries or patient data found in this log entry
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'hl7'}
			<div class="space-y-4">
				<!-- HL7 Message Information -->
				{#if log.hl7Message}
					<div>
						<h4 class="mb-2 text-sm font-medium text-purple-900">HL7 Message Details</h4>
						<div class="rounded border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
							{log.hl7Message}
						</div>
					</div>
				{/if}

				{#if log.processingType}
					<div>
						<h4 class="mb-2 text-sm font-medium text-purple-900">Processing Type</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-500">Type:</span>
								<span class="ml-2 font-medium text-gray-900">{formatValue(log.processingType)}</span
								>
							</div>
							{#if log.destinationNumber}
								<div>
									<span class="text-gray-500">Destination:</span>
									<span class="ml-2 font-medium text-gray-900"
										>{formatValue(log.destinationNumber)}</span
									>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				{#if !log.hl7Message && !log.processingType}
					<div class="py-8 text-center">
						<div class="mb-2 text-4xl text-gray-300">🏥</div>
						<div class="text-sm text-gray-500">
							No HL7 message information found in this log entry
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
